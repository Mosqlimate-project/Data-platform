import os
import json
import logging
from pathlib import Path
from typing import Union, Optional, Literal
from itertools import cycle, chain
from collections import defaultdict
from hashlib import blake2b
from dateutil import parser
from datetime import datetime as dt
from datetime import date

import pandas as pd
import numpy as np
from mosqlient.models.score import Scorer
from mosqlient.registry import Prediction as Pred

# from loguru import logger

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views import View
from django.db.models import CharField, functions, Sum, Max, Min, QuerySet

# from epiweeks import Week
from registry.models import Model, Prediction, PredictionDataRow
from datastore.models import DengueGlobal, Sprint202425
from main.utils import CODES_UF
from main.utils import UFs as UF_NAME
from main.api import MUN_DATA
from vis.dash.errors import VisualizationError
from .models import UFs, Macroregion, GeoMacroSaude, ResultsProbForecast, City
from .plots.home.vis_charts import uf_ibge_mapping
from .plots.forecast_map import macro_forecast_map_table
from .utils import obj_to_dataframe
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


class DashboardView(View):
    template_name = "vis/dashboard/index.html"

    def get(self, request):
        context = {}

        _defaults = {
            "disease": request.GET.get("disease") or None,
            "time_resolution": request.GET.get("time-resolution") or None,
            "adm_level": request.GET.get("adm-level") or None,
            "adm_0": "BRA",
            "adm_1": request.GET.get("adm-1") or None,
            "adm_2": request.GET.get("adm-2") or None,
            "adm_3": request.GET.get("adm-3") or None,
            "start_date": request.GET.get("start-date") or None,
            "end_date": request.GET.get("end-date") or None,
            "start_window_date": request.GET.get("start-window-date") or None,
            "end_window_date": request.GET.get("end-window-date") or None,
        }

        def _get_distinct_values(field: str, sprint: bool) -> list:
            return sorted(
                list(
                    Prediction.objects.filter(model__sprint=sprint)
                    .values_list(field, flat=True)
                    .distinct()
                )
            )

        dashboards = {
            "predictions": {
                # "url": reverse("dashboard"),
                "diseases": _get_distinct_values("model__disease", False),
                "time_resolutions": _get_distinct_values(
                    "model__time_resolution", False
                ),
                "adm_levels": _get_distinct_values("model__ADM_level", False),
                "query": _defaults,
            },
            "sprint": {
                # "url": reverse("dashboard_sprint"),
                "diseases": _get_distinct_values("model__disease", True),
                "time_resolutions": _get_distinct_values(
                    "model__time_resolution", True
                ),
                "adm_levels": _get_distinct_values("model__ADM_level", True),
                "query": _defaults,
            },
            "forecast_map": {
                # "url": reverse("dashboard_forecast_map"),
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

        dashboard = request.GET.get("dashboard") or "predictions"

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
        score: str = "log_score",
        confidence_level: float = 0.9,
    ) -> QuerySet[PredictionDataRow]:
        data = PredictionDataRow.objects.all()
        data = data.filter(predict__model__sprint=sprint)
        data = data.filter(predict__model__disease=disease)
        data = data.filter(predict__model__time_resolution=time_resolution)

        if str(adm_level) in ["1", "2"]:
            data = data.filter(predict__model__ADM_level=adm_level)
        else:
            raise ValueError("Incorrect adm_level value. Expecting: [1, 2]")

        if adm_1:
            if str(adm_1).isdigit():
                adm_1 = CODES_UF[int(adm_1)]

            data = data.filter(adm_1=adm_1)

        if adm_2:
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

            data = calculate_score(
                queryset=data,
                data=hist_alerta,
                confidence_level=confidence_level,
            ).order_by(score)

        return data

    @staticmethod
    def parse_query_request(request) -> dict:
        disease = request.GET.get("disease")
        time_resolution = request.GET.get("time-resolution")
        adm_level = request.GET.get("adm-level")
        adm_0 = request.GET.get("adm-0", "BRA")
        adm_1 = request.GET.get("adm-1", None)
        adm_2 = request.GET.get("adm-2", None)
        adm_3 = request.GET.get("adm-3", None)
        start_date = request.GET.get("start-date", None)
        end_date = request.GET.get("end-date", None)
        start_window_date = request.GET.get("start-window-date", None)
        end_window_date = request.GET.get("end-window-date", None)

        dates = [start_date, end_date, start_window_date, end_window_date]
        dates = [date.fromisoformat(d) if d else None for d in dates]
        start_date, end_date, start_window_date, end_window_date = dates

        query = {
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
        }

        return query


def get_predict_ids(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    data = DashboardView.filter_predictions(
        sprint=sprint,
        disease=query["disease"],
        time_resolution=query["time_resolution"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
    )

    return JsonResponse(
        {
            "predicts": list(
                data.values_list("predict__id", flat=True).distinct()
            )
        }
    )


def get_predicts_start_end_window_date(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    data = DashboardView.filter_predictions(
        sprint=sprint,
        disease=query["disease"],
        time_resolution=query["time_resolution"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
    ).aggregate(start_window_date=Min("date"), end_window_date=Max("date"))

    return JsonResponse(
        {
            "start_window_date": (
                data["start_window_date"].isoformat()
                if data["start_window_date"]
                else None
            ),
            "end_window_date": (
                data["end_window_date"].isoformat()
                if data["end_window_date"]
                else None
            ),
        }
    )


def get_adm_1_menu_options(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    data = DashboardView.filter_predictions(
        sprint=sprint,
        disease=query["disease"],
        time_resolution=query["time_resolution"],
        adm_level=query["adm_level"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
    )

    ufs = list(data.values_list("adm_1", flat=True).distinct())
    options = []
    for uf in ufs:
        if uf:
            options.append((uf, UF_NAME[uf]))
    return JsonResponse({"options": sorted(options, key=lambda x: x[1])})


def get_adm_2_menu_options(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    data = DashboardView.filter_predictions(
        sprint=sprint,
        disease=query["disease"],
        time_resolution=query["time_resolution"],
        adm_level=2,
        adm_1=query["adm_1"],
    )

    geocodes = list(data.values_list("adm_2", flat=True).distinct())
    mun_names = []
    for geocode in geocodes:
        mun_names.append(MUN_DATA[str(geocode)]["municipio"])
    options = list(tuple(zip(geocodes, mun_names)))
    return JsonResponse({"options": sorted(options, key=lambda x: x[1])})


def line_chart_base_view(request):
    width = request.GET.get("width", 450)
    title = request.GET.get("title")
    query = DashboardView.parse_query_request(request)

    chart = base_chart(
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
        width=int(width),
        title=title,
    )
    return JsonResponse(chart.to_dict(), safe=False)


def line_chart_data_view(request):
    width = request.GET.get("width", 450)
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    invalid_adm_level = check_adm_level(
        query["adm_level"], query["adm_1"], query["adm_2"]
    )

    if invalid_adm_level:
        return invalid_adm_level

    chart = data_chart(
        width=int(width),
        sprint=sprint,
        disease=query["disease"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
    )

    return JsonResponse(chart.to_dict(), safe=False)


def line_chart_predicts_view(request):
    title = request.GET.get("title")
    colors = request.GET.getlist("colors")
    width = request.GET.get("width", 450)
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    invalid_adm_level = check_adm_level(
        query["adm_level"], query["adm_1"], query["adm_2"]
    )

    if invalid_adm_level:
        return invalid_adm_level

    colors = [
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

    chart = predictions_chart(
        title=title,
        colors=colors,
        width=int(width),
        sprint=sprint,
        disease=query["disease"],
        time_resolution=query["time_resolution"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
    )

    return JsonResponse(chart.to_dict(), safe=False, status=200)


def get_predicts_score(request) -> JsonResponse:
    predict_ids = request.GET.getlist("predict")
    dashboard = request.GET.get("dashboard")
    query = DashboardView.parse_query_request(request)

    if dashboard == "forecast_map":
        return JsonResponse({"message": "not applied"}, status=204)
    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    predictions: list[Pred] = list(
        chain(*[Pred.get(id=_id) for _id in predict_ids])
    )

    invalid_adm_level = check_adm_level(
        query["adm_level"], query["adm_1"], query["adm_2"]
    )

    if invalid_adm_level:
        return invalid_adm_level

    data = hist_alerta_data(
        sprint=sprint,
        disease=query["disease"],
        start_window_date=query["start_window_date"],
        end_window_date=query["end_window_date"],
        adm_level=query["adm_level"],
        adm_1=query["adm_1"],
        adm_2=query["adm_2"],
    )

    scores = {}
    for prediction in predictions:
        scores[prediction.id] = prediction.calculate_score(data)

    return JsonResponse(scores)


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


class FetchScoreView(View):
    def get(self, request) -> JsonResponse:
        prediction_ids = request.GET.getlist("id") or []

        if not prediction_ids:
            return JsonResponse(
                {"error": "No Prediction selected"}, status=500
            )

        try:
            df = get_score(prediction_ids).summary
            df = df.reset_index()
            score = df.to_dict(orient="records")

            labels = []
            for s in score:
                labels.extend([k for k in s.keys() if k != "id"])

                if "log_score" in s and s["log_score"] == np.float64("-inf"):
                    s["log_score"] = "-"

            return JsonResponse(
                {"score": score, "score_labels": list(set(labels))}
            )
        except Exception as err:
            logging.error(err)
            return JsonResponse({"score_error": str(err)}, status=500)


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


def get_score(prediction_ids: list[int]) -> Scorer:
    if not prediction_ids:
        raise VisualizationError("No Prediction selected")

    try:
        predictions = Prediction.objects.filter(id__in=prediction_ids)
    except Prediction.DoesNotExist:
        raise VisualizationError("No Prediction selected")

    start: dt.date = None
    end: dt.date = None
    geocodes: set[int] = set()

    for prediction in predictions:
        if not prediction.visualizable:
            raise VisualizationError(
                f"Prediction with id {prediction.id} is not visualizable"
            )

        s = prediction.to_dataframe().date.min()
        e = prediction.to_dataframe().date.max()

        if not start:
            start = s
        if not end:
            end = e

        if s != start:
            raise VisualizationError(
                "Can't score Predictions with different start dates"
            )
        if e != end:
            raise VisualizationError(
                "Can't score Predictions with different end dates"
            )

        if prediction.model.ADM_level == 1:
            geocodes |= set(
                DengueGlobal.objects.using("infodengue")
                .annotate(
                    geocodigo_str=functions.Cast("geocodigo", CharField())
                )
                .filter(
                    geocodigo_str__startswith=str(prediction.adm_1_geocode)
                )
                .values_list("geocodigo", flat=True)
            )

        if prediction.model.ADM_level == 2:
            geocodes.add(int(prediction.adm_2_geocode))

    data = Sprint202425.objects.using("infodengue").filter(
        geocode__in=geocodes,
        date__gte=dt.fromisoformat(str(start)).date(),
        date__lte=dt.fromisoformat(str(end)).date(),
    )

    df: pd.DataFrame = pd.concat([obj_to_dataframe(o) for o in data])

    if prediction.model.ADM_level == 1:
        data = (
            data.values("date").annotate(casos=Sum("casos")).order_by("date")
        )
        df = pd.DataFrame(list(data))

    score = Scorer(df_true=df, ids=list(map(int, prediction_ids)))
    return score


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
