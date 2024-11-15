import os
import json
import math
from pathlib import Path
from typing import Union, Optional, Literal, List
from itertools import cycle
from collections import defaultdict
from hashlib import blake2b
from dateutil import parser
from datetime import date

# from loguru import logger

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views import View
from django.db import models

# from epiweeks import Week
from registry.models import Model, Prediction, PredictionDataRow
from main.utils import CODES_UF
from main.api import MUN_DATA
from .models import UFs, Macroregion, GeoMacroSaude, ResultsProbForecast, City
from .plots.home.vis_charts import uf_ibge_mapping
from .plots.forecast_map import macro_forecast_map_table
from .dash.line_chart import (
    base_chart,
    data_chart,
    predictions_chart,
    hist_alerta_data,
    calculate_score,
)


def is_null(val) -> bool:
    return str(val).upper() in ["", "NONE", "NULL", "UNDEFINED"]


def check_adm_level(adm_level, adm_1, adm_2) -> JsonResponse | None:
    if str(adm_level) == "1":
        if is_null(adm_1):
            return JsonResponse({"error": "adm_1 is required"}, status=422)
        return None
    elif str(adm_level) == "2":
        if is_null(adm_2):
            return JsonResponse({"error": "adm_2 is required"}, status=422)
        return None
    else:
        return JsonResponse(
            {"error": f"incorrect value for adm_level: {adm_level}"},
            status=422,
        )


def get_distinct_values(field: str, sprint: bool) -> list:
    return sorted(
        list(
            Prediction.objects.filter(model__sprint=sprint)
            .values_list(field, flat=True)
            .distinct()
        )
    )


def get_start_end_window_date(query: str) -> tuple[date, date]:
    data = DashboardView.filter_predictions(**query).aggregate(
        start_window_date=models.Min("date"),
        end_window_date=models.Max("date"),
    )
    return data["start_window_date"], data["end_window_date"]


def get_adm_menu_options(
    sprint: bool, diseases: list[str], time_resolutions: list[str]
) -> dict:
    adm_data = {}

    for disease in diseases:
        adm_data[disease] = {}
        for time_resolution in time_resolutions:
            adm_data[disease][time_resolution] = {}
            query = {
                "sprint": sprint,
                "disease": disease,
                "time_resolution": time_resolution,
            }

            adm_data[disease][time_resolution]["adm_1"] = list(
                DashboardView.filter_predictions(**query)
                .exclude(adm_1=None)
                .values_list("adm_1", flat=True)
                .distinct()
            )

            adm_data[disease][time_resolution]["adm_2"] = [
                (adm_2, MUN_DATA[str(adm_2)]["municipio"])
                for adm_2 in DashboardView.filter_predictions(**query)
                .exclude(adm_2=None)
                .values_list("adm_2", flat=True)
                .distinct()
            ]

    return adm_data


class DashboardView(View):
    template_name = "vis/dashboard/index.html"
    scores = ["mse", "mae", "crps", "log_score", "interval_score"]

    def get(self, request):
        context = {}

        _defaults = {
            "disease": request.GET.get("disease", None),
            "time_resolution": request.GET.get("time-resolution", None),
            "adm_level": request.GET.get("adm-level", None),
            "adm_0": "BRA",
            "adm_1": request.GET.get("adm-1", None),
            "adm_2": request.GET.get("adm-2", None),
            "adm_3": request.GET.get("adm-3", None),
            "start_date": request.GET.get("start-date", None),
            "end_date": request.GET.get("end-date", None),
            "start_window_date": request.GET.get("start-window-date", None),
            "end_window_date": request.GET.get("end-window-date", None),
            "score": request.GET.get("score", "log_score"),
            "prediction_ids": request.GET.getlist("prediction-ids", []),
        }

        dashboards = {
            "predictions": {
                "diseases": get_distinct_values("model__disease", False),
                "time_resolutions": get_distinct_values(
                    "model__time_resolution", False
                ),
                "adm_levels": get_distinct_values("model__ADM_level", False),
                "query": _defaults,
                "scores": self.scores,
            },
            "sprint": {
                "diseases": get_distinct_values("model__disease", True),
                "time_resolutions": get_distinct_values(
                    "model__time_resolution", True
                ),
                "adm_levels": get_distinct_values("model__ADM_level", True),
                "query": _defaults,
                "scores": self.scores,
            },
            "forecast_map": {
                "diseases": sorted(
                    list(
                        ResultsProbForecast.objects.values_list(
                            "disease", flat=True
                        ).distinct()
                    )
                ),
                "adm_levels": [0, 1, 2],
                "query": _defaults,
            },
        }

        for dashboard, data in dashboards.items():
            if dashboard == "predictions":
                predict_dates = (
                    PredictionDataRow.objects.filter(
                        predict__model__sprint=False
                    )
                    .values_list("date", flat=True)
                    .distinct()
                )
                data["adm_data"] = dict(
                    get_adm_menu_options(
                        sprint=False,
                        diseases=data["diseases"],
                        time_resolutions=data["time_resolutions"],
                    )
                )
                data["query"]["start_window_date"] = str(min(predict_dates))
                data["query"]["end_window_date"] = str(max(predict_dates))

            if dashboard == "sprint":
                predict_dates = (
                    PredictionDataRow.objects.filter(
                        predict__model__sprint=True
                    )
                    .values_list("date", flat=True)
                    .distinct()
                )
                data["adm_data"] = dict(
                    get_adm_menu_options(
                        sprint=True,
                        diseases=data["diseases"],
                        time_resolutions=data["time_resolutions"],
                    )
                )
                data["query"]["start_window_date"] = str(min(predict_dates))
                data["query"]["end_window_date"] = str(max(predict_dates))

            if not data["query"]["disease"]:
                if Model.Diseases.DENGUE in data["diseases"]:
                    data["query"]["disease"] = Model.Diseases.DENGUE
                else:
                    data["query"]["disease"] = data["diseases"][0]

            if not data["query"]["time_resolution"]:
                if Model.Periodicities.WEEK in data["time_resolutions"]:
                    data["query"]["time_resolution"] = Model.Periodicities.WEEK
                else:
                    data["query"]["time_resolution"] = data[
                        "time_resolutions"
                    ][0]

            if dashboard != "forecast_map":
                if not data["query"]["adm_level"]:
                    if Model.ADM_levels.STATE in data["adm_levels"]:
                        data["query"]["adm_level"] = Model.ADM_levels.STATE
                    else:
                        data["query"]["adm_level"] = data["adm_levels"][0]
            else:
                if not data["query"]["adm_level"]:
                    data["query"]["adm_level"] = 0

        dashboard = request.GET.get("dashboard", "predictions")

        context["dashboards"] = dashboards
        context["dashboard"] = dashboard

        return render(request, self.template_name, context)

    @staticmethod
    def filter_predictions(
        sprint: bool,
        disease: str,
        time_resolution: Literal["year", "month", "week", "day"],
        adm_level: Optional[Literal[0, 1, 2, 3]] = None,
        adm_1: Optional[Union[int, str]] = None,
        adm_2: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        start_window_date: Optional[date] = None,
        end_window_date: Optional[date] = None,
        confidence_level: float = 0.9,
        prediction_ids: List[int] = [],
        score: Literal[
            "mse", "mae", "crps", "log_score", "interval_score"
        ] = "interval_score",
        **kwargs,
    ) -> models.QuerySet[PredictionDataRow]:
        data = PredictionDataRow.objects.all()
        data = data.filter(predict__model__sprint=sprint)
        data = data.filter(predict__model__disease=disease)
        data = data.filter(predict__model__time_resolution=time_resolution)
        if prediction_ids:
            data = data.filter(predict_id__in=prediction_ids)

        data = data.annotate(
            mae=models.Value(None, output_field=models.FloatField()),
            mse=models.Value(None, output_field=models.FloatField()),
            crps=models.Value(None, output_field=models.FloatField()),
            log_score=models.Value(None, output_field=models.FloatField()),
            interval_score=models.Value(
                None, output_field=models.FloatField()
            ),
        )

        if adm_level:
            data = data.filter(predict__model__ADM_level=int(adm_level))

        if adm_1:
            if str(adm_1).isdigit():
                adm_1 = CODES_UF[int(adm_1)]

            data = data.filter(adm_1=adm_1)

        if adm_level == 2 and adm_2:
            data = data.filter(adm_2=int(adm_2))

        # if start_date and end_date:
        #     data = data.filter(date__range=(start_date, end_date))

        if start_window_date and end_window_date:
            data = data.filter(
                date__range=(start_window_date, end_window_date)
            )

        if (
            data
            and adm_level
            and (adm_1 or adm_2)
            and start_window_date
            and end_window_date
        ):
            hist_alerta = hist_alerta_data(
                sprint=sprint,
                disease=disease,
                start_window_date=start_window_date,
                end_window_date=end_window_date,
                adm_level=adm_level,
                adm_1=adm_1,
                adm_2=adm_2,
            )

            hist_alerta.rename(columns={"target": "casos"}, inplace=True)

            if not hist_alerta.empty:
                data = calculate_score(
                    queryset=data,
                    data=hist_alerta,
                    confidence_level=confidence_level,
                )

                if data.filter(**{f"{score}__isnull": False}).count() != 0:
                    data = data.order_by(score)

        return data

    @staticmethod
    def parse_query_request(
        request,
        required: list[str] = [
            "dashboard",
            "disease",
            "time_resolution",
            "adm_level",
        ],
    ) -> dict:
        dashboard = request.GET.get("dashboard", None)
        disease = request.GET.get("disease", None)
        time_resolution = request.GET.get("time-resolution", None)
        adm_level = request.GET.get("adm-level", None)
        adm_0 = request.GET.get("adm-0", "BRA")
        adm_1 = request.GET.get("adm-1", None)
        adm_2 = request.GET.get("adm-2", None)
        adm_3 = request.GET.get("adm-3", None)
        start_date = request.GET.get("start-date", None)
        end_date = request.GET.get("end-date", None)
        start_window_date = request.GET.get("start-window-date", None)
        end_window_date = request.GET.get("end-window-date", None)
        score = request.GET.get("score", None)
        prediction_ids = request.GET.getlist("prediction-ids", [])

        dates = [start_date, end_date, start_window_date, end_window_date]
        dates = [date.fromisoformat(d) if d else None for d in dates]
        start_date, end_date, start_window_date, end_window_date = dates

        if dashboard == "predictions":
            sprint = False
        elif dashboard == "sprint":
            sprint = True
        else:
            sprint = None

        query = {
            "dashboard": dashboard,
            "sprint": sprint,
            "disease": disease,
            "time_resolution": time_resolution,
            "adm_level": adm_level,
            "adm_0": adm_0,
            "adm_1": adm_1,
            "adm_2": adm_2,
            "adm_3": adm_3,
            "start_date": start_date,
            "end_date": end_date,
            "start_window_date": start_window_date,
            "end_window_date": end_window_date,
            "score": score,
            "prediction_ids": prediction_ids,
        }

        for field in required:
            if not query[field]:
                raise ValueError(f"'{field}' value is required")

        return query


def get_predictions(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard", "predictions")
    sprint = dashboard == "sprint"

    data = []
    for p in Prediction.objects.filter(model__sprint=sprint):
        window = p.data.aggregate(
            start=models.Min("date"), end=models.Max("date")
        )

        data.append(
            {
                "id": p.id,
                "disease": p.model.disease,
                "time_resolution": p.model.time_resolution,
                "adm_level": p.model.ADM_level,
                "adm_1": CODES_UF[p.adm_1_geocode],
                "adm_2": p.adm_2_geocode,
                "start_window_date": str(window["start"]),
                "end_window_date": str(window["end"]),
            }
        )

    return JsonResponse({"predictions": data})


def get_prediction_ids_specs(request) -> JsonResponse:
    prediction_ids = request.GET.getlist("ids")

    predictions = Prediction.objects.filter(id__in=prediction_ids)

    def get_distinct(predictions, field):
        return predictions.values_list(field, flat=True).distinct()

    disease = get_distinct(predictions, "model__disease")

    if len(disease) > 1:
        predictions = predictions.filter(model__disease=disease[0])

    time_resolution = get_distinct(predictions, "model__time_resolution")

    if len(time_resolution) > 1:
        predictions = predictions.filter(model__time_resolution=disease[0])

    adm_level = get_distinct(predictions, "model__ADM_level")

    if len(adm_level) > 1:
        predictions = predictions.filter(model__ADM_level=adm_level[0])

    adm_1 = get_distinct(predictions, "adm_1_geocode")

    if len(adm_1) > 1:
        predictions = predictions.filter(adm_1_geocode=adm_1[0])

    adm_2 = get_distinct(predictions, "adm_2_geocode")

    if len(adm_2) > 1:
        if adm_2[0]:
            predictions = predictions.filter(adm_2_geocode=adm_2[0])

    context = {
        "disease": disease[0],
        "time_resolution": time_resolution[0],
        "adm_level": adm_level[0],
        "adm_1": CODES_UF[adm_1[0]],
        "adm_2": adm_2[0],
        "prediction_ids": list(predictions.values_list("id", flat=True)),
    }

    return JsonResponse(context)


def get_prediction_scores(request) -> JsonResponse:
    prediction_ids = request.GET.get("prediction-ids").split(",")
    start_window_date = request.GET.get("start-window-date")
    end_window_date = request.GET.get("end-window-date")

    predictions = Prediction.objects.filter(id__in=prediction_ids)

    data = PredictionDataRow.objects.filter(
        id__in=[
            row.id
            for prediction in predictions
            for row in prediction.data.all()
        ]
    )

    scores = {
        prediction.id: {
            "mae": None,
            "mse": None,
            "crps": None,
            "log_score": None,
            "interval_score": None,
        }
        for prediction in predictions
    }

    data = data.annotate(
        mae=models.Value(None, output_field=models.FloatField()),
        mse=models.Value(None, output_field=models.FloatField()),
        crps=models.Value(None, output_field=models.FloatField()),
        log_score=models.Value(None, output_field=models.FloatField()),
        interval_score=models.Value(None, output_field=models.FloatField()),
    )

    data = data.filter(date__range=(start_window_date, end_window_date))

    def get_unique(rows, field, score=False):
        values = rows.values_list(field, flat=True).distinct()
        if len(values) != 1:
            if score:
                if len(list(filter(lambda x: x, values))) == 1:
                    return list(filter(lambda x: x, values))[0]
                return None
            return JsonResponse(scores)
        return values[0]

    hist_alerta = hist_alerta_data(
        sprint=get_unique(data, "predict__model__sprint"),
        disease=get_unique(data, "predict__model__disease"),
        start_window_date=start_window_date,
        end_window_date=end_window_date,
        adm_level=get_unique(data, "predict__model__ADM_level"),
        adm_1=get_unique(data, "adm_1"),
        adm_2=get_unique(data, "adm_2"),
    )

    hist_alerta.rename(columns={"target": "casos"}, inplace=True)

    if hist_alerta.empty:
        return JsonResponse(scores)

    data = calculate_score(
        queryset=data,
        data=hist_alerta,
        confidence_level=0.9,
    )

    for prediction in predictions:
        rows = data.filter(predict__id=prediction.id)
        for score in ["mae", "mse", "crps", "log_score", "interval_score"]:
            scores[prediction.id][score] = get_unique(rows, score, True)

    for prediction_id, metrics in scores.items():
        for key, value in metrics.items():
            if value is not None and (math.isnan(value) or math.isinf(value)):
                scores[prediction_id][key] = None

    return JsonResponse(scores)


def get_predict_ids(request) -> JsonResponse:
    query = DashboardView.parse_query_request(
        request, required=["dashboard", "disease"]
    )

    data = DashboardView.filter_predictions(**query)

    return JsonResponse(
        {
            "predicts": list(
                data.values_list("predict_id", query["score"]).distinct()
            )
        }
    )


def get_predict_list_data(request) -> JsonResponse:
    prediction_ids = request.GET.get("prediction-ids", [])
    prediction_ids = prediction_ids.split(",") if prediction_ids else []

    predictions = Prediction.objects.filter(
        id__in=list(map(int, prediction_ids))
    )

    context = {"data": {}}

    for prediction in predictions:
        data = {}
        data["model"] = f"{prediction.model.id} : {prediction.model.name}"
        data["predict_date"] = str(prediction.predict_date)
        context["data"][prediction.id] = data

    return JsonResponse(context)


def get_predicts_start_end_window_date(request) -> JsonResponse:
    query = DashboardView.parse_query_request(
        request,
        required=["dashboard", "disease", "time_resolution", "adm_level"],
    )

    start_window_date, end_window_date = get_start_end_window_date(query)

    return JsonResponse(
        {
            "start_window_date": (
                start_window_date.isoformat() if start_window_date else None
            ),
            "end_window_date": (
                end_window_date.isoformat() if end_window_date else None
            ),
        }
    )


def line_chart_base_view(request):
    width = request.GET.get("width", 450)
    title = request.GET.get("title")
    query = DashboardView.parse_query_request(
        request, required=["start_window_date", "end_window_date"]
    )

    chart = base_chart(
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
        width=int(width),
        title=title,
    )
    return JsonResponse(chart.to_dict(), safe=False)


def line_chart_data_view(request):
    width = request.GET.get("width", 450)
    query = DashboardView.parse_query_request(
        request,
        required=[
            "dashboard",
            "disease",
            "adm_level",
            "start_window_date",
            "end_window_date",
        ],
    )

    invalid_adm_level = check_adm_level(
        query["adm_level"], query["adm_1"], query["adm_2"]
    )

    if invalid_adm_level:
        return invalid_adm_level

    chart = data_chart(
        width=int(width),
        sprint=query["sprint"],
        disease=query["disease"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
    )

    return JsonResponse(chart.to_dict(), safe=False)


@csrf_exempt
def line_chart_predicts_view(request):
    if request.method != "POST":
        return JsonResponse(
            {"status": "error", "message": "Only POST requests are allowed"},
            status=405,
        )

    data = json.loads(request.body)

    invalid_adm_level = check_adm_level(
        data["adm_level"], data["adm_1"], data["adm_2"]
    )

    if invalid_adm_level:
        return invalid_adm_level

    chart = data_chart(
        width=data["width"],
        sprint=data["sprint"],
        disease=data["disease"],
        adm_level=data["adm_level"],
        adm_1=data["adm_1"],
        adm_2=data["adm_2"],
        start_window_date=data["start_window_date"],
        end_window_date=data["end_window_date"],
    )

    predictions = DashboardView.filter_predictions(
        sprint=data["sprint"],
        disease=data["disease"],
        time_resolution=data["time_resolution"],
        adm_level=data["adm_level"],
        adm_1=data["adm_1"],
        adm_2=data["adm_2"],
        start_window_date=data["start_window_date"],
        end_window_date=data["end_window_date"],
        prediction_ids=data["prediction_ids"],
    )

    if predictions.filter(**{f"{data['score']}__isnull": False}).count() != 0:
        predictions = predictions.order_by(data["score"])

    line_chart = predictions_chart(
        title=data["title"],
        colors=data["colors"],
        width=data["width"],
        queryset=predictions,
        data_chart=chart,
        start_window_date=data["start_window_date"],
        end_window_date=data["end_window_date"],
    )

    return JsonResponse(
        {"status": "success", "chart": line_chart.to_dict()},
        safe=False,
        status=200,
    )


class DashboardForecastMacroView(View):
    template_name = "vis/dashboard-forecast-map.html"

    @xframe_options_exempt
    def get(self, request):
        context = {}

        dates_by_disease = defaultdict(list)

        for res in ResultsProbForecast.objects.values(
            "disease", "date"
        ).distinct():
            dates_by_disease[res["disease"]].append(str(res["date"]))

        context["dates_by_disease"] = dict(dates_by_disease)

        context["macroregions"] = list(
            Macroregion.objects.values_list("geocode", "name")
        )

        context["ufs"] = UFs.choices

        context["macros_saude"] = list(
            GeoMacroSaude.objects.values_list(
                "geocode", "name", "state__uf"
            ).order_by("geocode")
        )

        return render(request, self.template_name, context)


class PredictTableView(View):
    template_name = "vis/charts/prediction-table.html"

    @xframe_options_exempt
    def get(self, request):
        prediction_ids = request.GET.getlist("predict")
        context = {}

        colors = cycle(
            [
                "#A6BCD4",
                "#FAC28C",
                "#F2ABAB",
                "#B9DBD9",
                "#AAD1A5",
                "#F7E59D",
                "#D9BCD1",
                "#FFCED3",
                "#CEBAAE",
            ]
        )

        predictions: set[Prediction] = set()
        for id in prediction_ids:
            predict = get_object_or_404(Prediction, pk=id)
            predictions.add(predict)

        infos = []
        for prediction in predictions:
            info = {}
            info["model_id"] = prediction.model.id
            info["model"] = prediction.model.name
            info["prediction_id"] = prediction.id
            info["disease"] = prediction.model.disease.capitalize()
            if prediction.adm_2_geocode and prediction.model.ADM_level == 2:
                geocode = prediction.adm_2_geocode
                geocode_info = json.loads(
                    get_geocode_info(request, geocode).content
                )
                info["locality"] = geocode_info["municipio"]
            else:
                info["locality"] = "BR"  # TODO
            info["prediction_date"] = prediction.predict_date
            info["color"] = next(colors)
            infos.append(info)

        context["prediction_ids"] = prediction_ids
        context["prediction_infos"] = infos
        return render(request, self.template_name, context)


class MacroForecastMap(View):
    def get(self, request):
        disease = request.GET.get("disease")
        date = request.GET.get("date")
        macroregion = request.GET.get("macroregion", None)
        uf = request.GET.get("uf", None)
        geocodes = request.GET.getlist("geocode", [])

        date = parser.parse(date).date()
        unique_flag: str = ""
        params: dict = {"disease": disease, "date": date, "request": request}

        if geocodes:
            geocodes = sorted(list(map(str, geocodes)))
            unified_geocodes = "".join(geocodes).encode()
            unique_flag = blake2b(unified_geocodes, digest_size=10).hexdigest()
            params |= {"geocodes": geocodes}

        if uf:
            uf = str(uf).upper()
            unique_flag = uf
            params |= {"uf": uf}

        if macroregion:
            macroregion = str(macroregion)
            macros = {
                "1": "norte",
                "2": "nordeste",
                "3": "centrooeste",
                "4": "sudeste",
                "5": "sul",
            }
            unique_flag = macros[macroregion]
            params |= {"macroregion": macroregion}

        if unique_flag:
            html_name = disease + "-" + str(date) + "-" + unique_flag + ".html"
        else:
            html_name = disease + "-" + str(date) + ".html"

        macro_html_dir = Path(
            os.path.join(settings.STATIC_ROOT, "vis/brasil/geomacrosaude")
        )

        if not macro_html_dir.exists():
            macro_html_dir.mkdir(parents=True, exist_ok=True)

        macro_html_file = macro_html_dir / html_name

        if macro_html_file.exists():
            return FileResponse(
                open(macro_html_file, "rb"), content_type="text/html"
            )

        macro_map = macro_forecast_map_table(**params)

        macro_map.save(str(macro_html_file), "html")

        return FileResponse(
            open(macro_html_file, "rb"), content_type="text/html"
        )


def get_model_selector_item(request, model_id):
    try:
        model = Model.objects.get(pk=model_id)
        data = {
            "name": model.name,
            "description": model.description,
        }
        return JsonResponse(data)
    except Model.DoesNotExist:
        return JsonResponse({"error": "Model not found"}, status=404)


def get_prediction_selector_item(request, prediction_id):
    try:
        prediction = Prediction.objects.get(pk=prediction_id)
        data = {
            "model_id": prediction.model.id,
            "description": prediction.description,
        }
        return JsonResponse(data)
    except Prediction.DoesNotExist:
        return JsonResponse({"error": "Prediction not found"}, status=404)


def get_geocode_info(request, geocode: Union[str, int]):
    geocode = str(geocode)
    municipios_file = os.path.join("static", "data/geo/BR/municipios.json")

    if os.path.isfile(municipios_file):
        with open(municipios_file, "r") as f:
            geocodes = json.load(f)

        data = geocodes[geocode]
        uf_code = data["codigo_uf"]

        for uf, info in uf_ibge_mapping.items():
            if str(info["code"]) == str(uf_code):
                data["uf"] = uf

        return JsonResponse(data)
    else:
        return JsonResponse({"error": "Geocode not found"}, status=404)


def get_city_info(request):
    geocode = request.GET.get("geocode")
    name = request.GET.get("name")
    uf = request.GET.get("uf")

    if geocode:
        city = City.objects.filter(geocode=geocode).first()
    elif uf and name:
        city = City.objects.filter(
            microregion__mesoregion__state__uf=uf, name__icontains=name
        ).first()
    else:
        return JsonResponse(
            {
                "message": (
                    "Either geocode or name and uf must be provided "
                    + "to get the city information"
                )
            },
            status=422,
        )

    if not city:
        return JsonResponse({"message": "City not found"}, status=404)

    return JsonResponse(
        {
            "geocode": city.geocode,
            "name": city.name,
            "state": {
                "geocode": city.microregion.mesoregion.state.geocode,
                "name": city.microregion.mesoregion.state.name,
                "uf": city.microregion.mesoregion.state.uf,
            },
        }
    )
