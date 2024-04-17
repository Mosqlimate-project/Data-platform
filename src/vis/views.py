import os
import json
from pathlib import Path
from typing import Union
from itertools import cycle
from hashlib import blake2b
from dateutil import parser

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views import View

from registry.models import Model, Prediction
from main.api import get_municipality_info
from main.utils import UF_CODES
from vis.dash.errors import VisualizationError
from .dash.charts import line_charts_by_geocode
from .plots.home.vis_charts import uf_ibge_mapping
from .plots.forecast_map import macro_forecast_map_table
from .utils import merge_uri_params

code_to_state = {v: k for k, v in UF_CODES.items()}


class DashboardView(View):
    template_name = "vis/dashboard.html"

    def get(self, request):
        context = {}

        context["selectedDisease"] = None
        context["selectedTimeResolution"] = None
        context["selectedADMLevel"] = None
        context["selectedSpatial"] = None
        context["selectedTemporal"] = None
        context["selectedOutputFormat"] = None
        context["selectedGeocode"] = None
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
                selected_prediction_ids.add(prediction.id)

        if context["selectedDisease"] == "chikungunya":
            context["selectedDisease"] = "chik"

        context["selectedPredictions"] = list(selected_prediction_ids)

        models = Model.objects.all()
        predictions = Prediction.objects.filter(visualizable=True)

        city_names_w_uf = []
        for geocode in predictions.values_list("adm_2_geocode", flat=True):
            if geocode:
                _, info = get_municipality_info(request, geocode)
                city_names_w_uf.append(f"{info['municipio']} - {info['uf']}")

        predictions_data = list(
            zip(
                list(predictions.values_list("id", flat=True)),
                list(predictions.values_list("model__name", flat=True)),
                list(predictions.values_list("metadata", flat=True)),
                city_names_w_uf,
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
            info["model"] = f"{prediction.model.id} - {prediction.model.name}"
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

        context["prediction_infos"] = infos
        return render(request, self.template_name, context)


class MacroForecastMap(View):
    def get(self, request):
        date = request.GET.get("date")
        macroregion = request.GET.get("macroregion", None)
        uf = request.GET.get("uf", None)
        geocodes = request.GET.getlist("geocode", [])

        date = parser.parse(date).date()
        unique_flag: str = ""
        params: dict = {"date": date}

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
            html_name = str(date) + "-" + unique_flag + ".html"
        else:
            html_name = str(date) + ".html"

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
