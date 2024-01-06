import os
import json
from typing import Union
from collections import defaultdict

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views import View

from registry.models import Model, Prediction
from .dash.charts import line_charts_by_geocode
from .home.vis_charts import uf_ibge_mapping


class DashboardView(View):
    template_name = "vis/dashboard.html"

    def get(self, request):
        context = {}

        # model_id = request.GET.get("model")
        # prediction_id = request.GET.get("predict")

        # all_models = Model.objects.all()

        # selected_series: Literal["spatial", "time"] = "time"
        # selected_adm_level: Literal[0, 1, 2, 3] = 2
        # selected_disease: Literal["dengue", "zika", "chikungunya"] = "dengue"
        # selected_geocode: int = None
        # selected_prediction: int = None

        # line_charts_default_items = []

        # if model_id:
        #     model = get_object_or_404(Model, pk=int(model_id))
        #     selected_series = model.type
        #     selected_adm_level = model.ADM_level
        #     selected_disease = model.disease
        #     predictions = Prediction.objects.filter(model=model)
        #     geocodes = list(
        #         set(p.adm_2_geocode for p in predictions if p.adm_2_geocode)
        #     )
        #     selected_geocode = geocodes[0]

        # if prediction_id:
        #     prediction = get_object_or_404(Prediction, pk=int(prediction_id))
        #     selected_series = prediction.model.type
        #     selected_adm_level = model.ADM_level
        #     selected_disease = model.disease
        #     if prediction.adm_2_geocode:
        #         selected_geocode = prediction.adm_2_geocode
        #     selected_prediction = prediction.id

        #     line_charts_default_items.append(f"predict={prediction.id}")

        # context["compatibilities"] = generate_models_compatibility_info(
        #     all_models, json_return=True
        # )

        # context["available_adm_levels"] = get_available_adm_levels(all_models)
        # context["available_diseases"] = get_available_diseases(all_models)
        # context["available_geocodes"] = get_available_adm_2_geocodes(
        #     all_models
        # )

        # context["selected_series"] = selected_series
        # context["selected_adm_level"] = selected_adm_level
        # context["selected_disease"] = selected_disease
        # context["selected_geocode"] = selected_geocode
        # context["selected_prediction"] = selected_prediction

        # context["line_charts_default_uri"] = "?" + "&".join(
        #     line_charts_default_items
        # )

        models = Model.objects.all()
        predictions = Prediction.objects.filter(visualizable=True)

        context["predictions"] = dict(
            zip(
                list(predictions.values_list("id", flat=True)),
                list(predictions.values_list("metadata", flat=True)),
            )
        )

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

            with open(municipios_file, "r") as f:
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

        context["adm_2_geocodes"] = list(geocode_cities)

        return render(request, self.template_name, context)


class LineChartsView(View):
    template_name = "vis/charts/line-charts.html"

    def get(self, request):
        context = {}

        prediction_ids = request.GET.getlist("predict")

        predictions: set[Prediction] = set()

        if not prediction_ids:
            # Show "Please select Predictions"
            return render(request, "vis/errors/no-prediction.html", context)

        if prediction_ids:
            for id in prediction_ids:
                predict = get_object_or_404(Prediction, pk=id)
                predictions.add(predict)

        ids = []
        infos = []
        for prediction in predictions:
            info = {}
            ids.append(prediction.id)
            info["model_id"] = prediction.model.id
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
            infos.append(info)

        context["prediction_ids"] = ids
        context["prediction_infos"] = infos

        try:
            line_chart = line_charts_by_geocode(
                title="Forecast of dengue new cases",
                predictions_ids=ids,
                disease="dengue",
                width=450,
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


def generate_models_compatibility_info(
    models: list[Model], json_return: bool = False
) -> dict:
    info = defaultdict()
    for _type in Model.Types:
        info[str(_type)] = defaultdict()

    for disease in Model.Diseases:
        for _type in info:
            info[_type][str(disease)] = defaultdict()

    for adm_level in Model.ADM_levels:
        for _type in info:
            for disease in info[_type]:
                if adm_level == 2:
                    info[_type][disease][adm_level.value] = defaultdict(
                        lambda: defaultdict(list)
                    )
                else:
                    info[_type][disease][adm_level.value] = defaultdict(list)

    for model in models:
        predictions = Prediction.objects.filter(model=model)
        for prediction in predictions:
            if not model.type:
                continue

            if not model.disease:
                continue

            if model.ADM_level == model.ADM_levels.MUNICIPALITY:
                if prediction.adm_2_geocode:
                    info[model.type][model.disease][model.ADM_level][
                        prediction.adm_2_geocode
                    ][model.id].append(prediction.id)
            else:
                info[model.type][model.disease][model.ADM_level][
                    model.id
                ].append(prediction.id)

    info = json.dumps(info, cls=SetToListEncoder)

    if not json_return:
        return json.loads(info)

    return info


class SetToListEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)
