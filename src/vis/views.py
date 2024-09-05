import os
import json
import logging
from pathlib import Path
from typing import Union
from itertools import cycle
from collections import defaultdict
from hashlib import blake2b
from dateutil import parser
from datetime import datetime as dt

import pandas as pd
import numpy as np
from mosqlient.models.score import Scorer

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views import View
from django.urls import reverse
from django.db.models import CharField, functions, Sum

from registry.models import Model, Prediction
from datastore.models import DengueGlobal, Sprint202425
from main.api import get_municipality_info
from main.utils import UF_CODES
from vis.dash.errors import VisualizationError
from .models import (
    UFs,
    Macroregion,
    GeoMacroSaude,
    ResultsProbForecast,
)
from .dash.charts import line_charts_by_geocode
from .plots.home.vis_charts import uf_ibge_mapping
from .plots.forecast_map import macro_forecast_map_table
from .utils import merge_uri_params, obj_to_dataframe

code_to_state = {v: k for k, v in UF_CODES.items()}


class DashboardView(View):
    template_name = "vis/dashboard/index.html"

    def get(self, request):
        context = {}

        model_ids = request.GET.getlist("model") or (
            Model.objects.all().values_list("id", flat=True)
        )

        prediction_ids = request.GET.getlist("predict") or (
            Prediction.objects.all().values_list("id", flat=True)
        )

        _defaults = {
            "disease": None,
            "adm_level": None,
            "time_resolution": None,
            "start_date": None,
            "end_date": None,
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
            "Predictions": {
                "url": reverse("dashboard"),
                "diseases": _get_distinct_values("model__disease", False),
                "time_resolutions": _get_distinct_values(
                    "model__time_resolution", False
                ),
                "adm_levels": _get_distinct_values("model__ADM_level", False),
                "defaults": _defaults,
            },
            "Sprint 2024/25": {
                "url": reverse("dashboard_sprint"),
                "diseases": _get_distinct_values("model__disease", True),
                "time_resolutions": _get_distinct_values(
                    "model__time_resolution", True
                ),
                "adm_levels": _get_distinct_values("model__ADM_level", True),
                "defaults": _defaults,
            },
            "Forecast Map": {
                "url": reverse("dashboard_forecast_map"),
                "diseases": [],
                "adm_levels": [],
                "time_resolutions": [],
                "defaults": _defaults,
            },
        }

        dashboard = request.GET.get("dashboard")

        if dashboard not in dashboards:
            for name in dashboards:
                dashboard = name
                break

        from pprint import pprint

        pprint(dashboards)

        context["dashboards"] = dashboards
        context["dashboard"] = dashboard

        context["model_ids"] = list(model_ids)
        context["prediction_ids"] = list(prediction_ids)

        context["start_date"] = "2000-01-01"
        context["end_date"] = "2001-01-01"
        context["start_window_date"] = "2000-01-01"
        context["end_window_date"] = "2001-01-01"

        return render(request, self.template_name, context)


class DashboardOldView(View):
    template_name = "vis/dashboard-old.html"

    def get(self, request):
        codes_uf = {v: k for k, v in UF_CODES.items()}
        context = {}

        context["selectedDisease"] = None
        context["selectedTimeResolution"] = None
        context["selectedADMLevel"] = None
        context["selectedSpatial"] = None
        context["selectedTemporal"] = None
        context["selectedOutputFormat"] = None
        context["selectedGeocode"] = None
        context["selectedSprint"] = None
        selected_prediction_ids = set()

        selected_model = request.GET.get("model", None)
        selected_predictions = request.GET.getlist("predict", None)

        if selected_model:
            model = Model.objects.get(pk=selected_model)
            context["selectedDisease"] = model.disease or None
            context["selectedTimeResolution"] = model.time_resolution or None
            context["selectedADMLevel"] = model.ADM_level
            context["selectedSpatial"] = model.spatial
            context["selectedTemporal"] = model.temporal
            context["selectedOutputFormat"] = model.categorical
            context["selectedSprint"] = "0" if not model.sprint else "1"

        if selected_predictions:
            for id in selected_predictions:
                prediction = Prediction.objects.get(pk=id)
                context["selectedDisease"] = prediction.model.disease or None
                context["selectedTimeResolution"] = (
                    prediction.model.time_resolution or None
                )
                context["selectedADMLevel"] = prediction.model.ADM_level
                context["selectedSpatial"] = prediction.model.spatial
                context["selectedTemporal"] = prediction.model.temporal
                context["selectedOutputFormat"] = prediction.model.categorical
                context["selectedGeocode"] = prediction.adm_2_geocode or None
                context["selectedSprint"] = (
                    "0" if not prediction.model.sprint else "1"
                )
                selected_prediction_ids.add(prediction.id)

        context["selectedPredictions"] = list(selected_prediction_ids)

        models = Model.objects.filter(sprint=False)
        predictions = Prediction.objects.filter(
            visualizable=True, model__sprint=False
        )
        predictions_data = []

        for prediction in predictions.filter(model__ADM_level=1):
            if prediction.adm_1_geocode:
                predictions_data.append(
                    tuple(
                        [
                            prediction.id,
                            prediction.model.name,
                            prediction.metadata,
                            codes_uf[prediction.adm_1_geocode],
                        ]
                    )
                )

        for prediction in predictions.filter(model__ADM_level=2):
            if prediction.adm_2_geocode:
                _, info = get_municipality_info(
                    request, prediction.adm_2_geocode
                )
                predictions_data.append(
                    tuple(
                        [
                            prediction.id,
                            prediction.model.name,
                            prediction.metadata,
                            f"{info['municipio']} - {info['uf']}",
                        ]
                    )
                )

        context["predictions"] = predictions_data

        model_types = set()
        output_formats = set()
        for model in models:
            if model.categorical:
                output_formats.add("C")
            else:
                output_formats.add("Q")

            if model.spatial:
                model_types.add("spatial")

            if model.temporal:
                model_types.add("temporal")

        context["model_types"] = list(model_types)
        context["output_formats"] = list(output_formats)

        context["diseases"] = list(
            set(models.values_list("disease", flat=True))
        )

        context["adm_levels"] = list(
            set(models.values_list("ADM_level", flat=True))
        )

        context["time_resolutions"] = list(
            set(models.values_list("time_resolution", flat=True))
        )

        adm_2_geocodes = set(
            predictions.values_list("adm_2_geocode", flat=True)
        )

        geocode_cities = set()
        municipios_file = os.path.join("static", "data/geo/BR/municipios.json")
        if os.path.isfile(municipios_file):
            uf_codes = dict()
            for uf, info in uf_ibge_mapping.items():
                uf_codes[int(info["code"])] = uf

            with open(municipios_file, "rb") as f:
                geocodes = json.load(f)

            for geocode in geocodes:
                if int(geocode) in adm_2_geocodes:
                    data = geocodes[geocode]
                    geocode_cities.add(
                        (
                            geocode,
                            data["municipio"],
                            uf_codes[int(data["codigo_uf"])],
                        )
                    )

        context["selected_predictions_uri"] = merge_uri_params(
            selected_predictions, "predict"
        )

        context["adm_2_geocodes"] = list(geocode_cities)

        return render(request, self.template_name, context)


class DashboardSprintView(View):
    template_name = "vis/dashboard-sprint.html"

    def get(self, request):
        codes_uf = {v: k for k, v in UF_CODES.items()}
        context = {}

        context["selectedDisease"] = None
        context["selectedTimeResolution"] = None
        context["selectedADMLevel"] = None
        context["selectedSpatial"] = None
        context["selectedTemporal"] = None
        context["selectedOutputFormat"] = None
        context["selectedGeocode"] = None
        context["selectedSprint"] = None
        selected_prediction_ids = set()

        selected_model = request.GET.get("model", None)
        selected_predictions = request.GET.getlist("predict", None)

        if selected_model:
            model = Model.objects.get(pk=selected_model)
            context["selectedDisease"] = model.disease or None
            context["selectedTimeResolution"] = model.time_resolution or None
            context["selectedADMLevel"] = model.ADM_level
            context["selectedSpatial"] = model.spatial
            context["selectedTemporal"] = model.temporal
            context["selectedOutputFormat"] = model.categorical
            context["selectedSprint"] = "0" if not model.sprint else "1"

        if selected_predictions:
            for id in selected_predictions:
                prediction = Prediction.objects.get(pk=id)
                context["selectedDisease"] = prediction.model.disease or None
                context["selectedTimeResolution"] = (
                    prediction.model.time_resolution or None
                )
                context["selectedADMLevel"] = prediction.model.ADM_level
                context["selectedSpatial"] = prediction.model.spatial
                context["selectedTemporal"] = prediction.model.temporal
                context["selectedOutputFormat"] = prediction.model.categorical
                context["selectedGeocode"] = prediction.adm_2_geocode or None
                context["selectedSprint"] = (
                    "0" if not prediction.model.sprint else "1"
                )
                selected_prediction_ids.add(prediction.id)

        context["selectedPredictions"] = list(selected_prediction_ids)

        models = Model.objects.filter(sprint=True)
        predictions = Prediction.objects.filter(
            visualizable=True, model__sprint=True
        )
        predictions_data = []

        for prediction in predictions.filter(model__ADM_level=1):
            if prediction.adm_1_geocode:
                predictions_data.append(
                    tuple(
                        [
                            prediction.id,
                            prediction.model.name,
                            prediction.metadata,
                            codes_uf[prediction.adm_1_geocode],
                        ]
                    )
                )

        for prediction in predictions.filter(model__ADM_level=2):
            if prediction.adm_2_geocode:
                _, info = get_municipality_info(
                    request, prediction.adm_2_geocode
                )
                predictions_data.append(
                    tuple(
                        [
                            prediction.id,
                            prediction.model.name,
                            prediction.metadata,
                            f"{info['municipio']} - {info['uf']}",
                        ]
                    )
                )

        context["predictions"] = predictions_data

        model_types = set()
        output_formats = set()
        for model in models:
            if model.categorical:
                output_formats.add("C")
            else:
                output_formats.add("Q")

            if model.spatial:
                model_types.add("spatial")

            if model.temporal:
                model_types.add("temporal")

        context["model_types"] = list(model_types)
        context["output_formats"] = list(output_formats)

        context["diseases"] = list(
            set(models.values_list("disease", flat=True))
        )

        context["adm_levels"] = list(
            set(models.values_list("ADM_level", flat=True))
        )

        context["time_resolutions"] = list(
            set(models.values_list("time_resolution", flat=True))
        )

        adm_2_geocodes = set(
            predictions.values_list("adm_2_geocode", flat=True)
        )

        geocode_cities = set()
        municipios_file = os.path.join("static", "data/geo/BR/municipios.json")
        if os.path.isfile(municipios_file):
            uf_codes = dict()
            for uf, info in uf_ibge_mapping.items():
                uf_codes[int(info["code"])] = uf

            with open(municipios_file, "rb") as f:
                geocodes = json.load(f)

            for geocode in geocodes:
                if int(geocode) in adm_2_geocodes:
                    data = geocodes[geocode]
                    geocode_cities.add(
                        (
                            geocode,
                            data["municipio"],
                            uf_codes[int(data["codigo_uf"])],
                        )
                    )

        context["selected_predictions_uri"] = merge_uri_params(
            selected_predictions, "predict"
        )

        context["adm_2_geocodes"] = list(geocode_cities)

        return render(request, self.template_name, context)


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
