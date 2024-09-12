import os
import json
import logging
from pathlib import Path
from typing import Union, Optional, Literal, List
from itertools import cycle
from collections import defaultdict
from hashlib import blake2b
from dateutil import parser
from datetime import datetime as dt
from datetime import date

import pandas as pd
import numpy as np
from mosqlient.models.score import Scorer

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views import View
from django.db.models import CharField, functions, Sum

from epiweeks import Week
from registry.models import Model, Prediction, PredictionDataRow
from datastore.models import DengueGlobal, Sprint202425
from main.utils import UF_CODES
from main.utils import UFs as UF_name
from main.api import MUN_DATA
from vis.dash.errors import VisualizationError
from .models import UFs, Macroregion, GeoMacroSaude, ResultsProbForecast, City
from .dash.charts import line_charts_by_geocode
from .plots.home.vis_charts import uf_ibge_mapping
from .plots.forecast_map import macro_forecast_map_table
from .utils import obj_to_dataframe

code_to_state = {v: k for k, v in UF_CODES.items()}


class DashboardView(View):
    template_name = "vis/dashboard/index.html"

    def get(self, request):
        context = {}

        _defaults = {
            "disease": (
                request.GET.get("disease") or str(Model.Diseases.DENGUE)
            ),
            "time_resolution": (
                request.GET.get("time-resolution")
                or str(Model.Periodicities.WEEK)
            ),
            "adm_level": (
                request.GET.get("adm-level")
                or int(Model.ADM_levels.MUNICIPALITY)
            ),
            "adm_0": "BRA",
            "adm_1": request.GET.get("adm-1") or None,
            "adm_2": request.GET.get("adm-2") or None,
            "adm_3": request.GET.get("adm-3") or None,
            "start_date": (
                request.GET.get("start-date")
                or str(Week.thisweek().startdate())
            ),
            "end_date": (
                request.GET.get("end-date") or str(Week.thisweek().enddate())
            ),
            "start_window_date": None,
            "end_window_date": None,
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
                "adm_levels": [0, 1, 2, 3],
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
    ) -> List[int]:
        data = PredictionDataRow.objects.all()
        data = data.filter(predict__model__sprint=sprint)
        data = data.filter(predict__model__disease=disease)
        data = data.filter(predict__model__time_resolution=time_resolution)

        if adm_level:
            data = data.filter(predict__model__ADM_level=adm_level)

        if adm_1:
            if isinstance(adm_1, str):
                adm_1 = UF_CODES[adm_1.upper()]

            data = data.filter(predict__adm_1_geocode=adm_1)

        if adm_2:
            data = data.filter(predict__adm_2_geocode=adm_2)

        if start_date and end_date:
            data = data.filter(
                predict__predict_date__range=(start_date, end_date)
            )

        if start_window_date and end_window_date:
            data = data.filter(
                date__range=(start_window_date, end_window_date)
            )

        context["selectedPredictions"] = list(selected_prediction_ids)


def get_adm_1_menu_options(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    disease = request.GET.get("disease")
    time_resolution = request.GET.get("time-resolution")
    # start_date = request.GET.get("start-date")
    # end_date = request.GET.get("end-date")
    # start_window_date = request.GET.get("start-window-date")
    # end_window_date = request.GET.get("end-window-date")
    if dashboard == "forecast_map":
        return JsonResponse({})

    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    ids = DashboardView.filter_predictions(
        sprint=sprint,
        disease=disease,
        time_resolution=time_resolution,
    )

    data = PredictionDataRow.objects.filter(id__in=ids)

    ufs = list(data.values_list("adm_1", flat=True).distinct())
    uf_names = []
    for uf in ufs:
        uf_names.append(UF_name[uf])
    options = list(tuple(zip(ufs, uf_names)))
    print(f"{dashboard}")
    print(f"{disease}")
    print(f"{time_resolution}")
    print(f"{sprint}")
    print(f"{options}")
    return JsonResponse({"options": sorted(options, key=lambda x: x[1])})


def get_adm_2_menu_options(request) -> JsonResponse:
    dashboard = request.GET.get("dashboard")
    disease = request.GET.get("disease")
    time_resolution = request.GET.get("time-resolution")
    adm_1 = request.GET.get("adm-1")
    # start_date = request.GET.get("start-date")
    # end_date = request.GET.get("end-date")
    # start_window_date = request.GET.get("start-window-date")
    # end_window_date = request.GET.get("end-window-date")
    if dashboard == "forecast_map":
        return JsonResponse({})

    if dashboard == "predictions":
        sprint = False
    if dashboard == "sprint":
        sprint = True

    ids = DashboardView.filter_predictions(
        sprint=sprint,
        disease=disease,
        time_resolution=time_resolution,
        adm_1=adm_1,
    )

    data = PredictionDataRow.objects.filter(id__in=ids)

    geocodes = list(data.values_list("adm_2", flat=True).distinct())
    mun_names = []
    for geocode in geocodes:
        mun_names.append(MUN_DATA[str(geocode)]["municipio"])
    options = list(tuple(zip(geocodes, mun_names)))
    return JsonResponse({"options": sorted(options, key=lambda x: x[1])})


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


class LineChartsView(View):
    template_name = "vis/charts/line-charts.html"

    @xframe_options_exempt
    def get(self, request):
        context = {}

        prediction_ids = request.GET.getlist("predict")

        diseases: set[str] = set()
        for id in prediction_ids:
            predict = get_object_or_404(Prediction, pk=id)
            diseases.add(predict.model.disease)

        if len(diseases) > 1:
            raise VisualizationError(
                "Multiple diseases were selected to be visualized"
            )

        if not prediction_ids:
            # Show "Please select Predictions"
            return render(request, "vis/errors/no-prediction.html", context)

        try:
            line_chart = line_charts_by_geocode(
                title="Forecast of dengue new cases",
                predictions_ids=list(set(prediction_ids)),
                disease=diseases.pop(),
                width=450,
                request=request,
            )
            line_chart = line_chart.to_html().replace(
                "</head>",
                "<style>#vis.vega-embed {width: 100%;}</style></head>",
            )
            context["line_chart"] = line_chart
        except Exception as e:
            # TODO: ADD HERE ERRORING PAGES TO BE RETURNED
            context["error"] = e

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
