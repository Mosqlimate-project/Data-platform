import json
from typing import Literal
from collections import defaultdict

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views import View

from registry.models import Model, Prediction
from .dash.errors import VisualizationError
from .dash.charts import line_charts_by_geocode


class VisualizationsView(View):
    template_name = "vis/dashboard.html"

    def get(self, request):
        context = {}

        model_id = request.GET.get("model")
        prediction_id = request.GET.get("predict")

        all_models = Model.objects.all()

        selected_series: Literal["spatial", "time"] = "time"
        selected_adm_level: Literal[0, 1, 2, 3] = 2
        selected_disease: Literal["dengue", "zika", "chikungunya"] = "dengue"
        selected_geocode: int = None
        selected_model: int = None
        selected_prediction: int = None

        line_charts_default_items = []

        for model in all_models:
            charts = model.get_visualizables()
            if charts:
                for chart in charts:
                    if str(model.id) == model_id:
                        selected_series = model.type
                        selected_adm_level = model.ADM_level
                        selected_disease = model.disease
                        if chart == "LineChartADM2":
                            predictions = Prediction.objects.filter(
                                model=model
                            )
                            geocodes = list(
                                set(
                                    p.adm_2_geocode
                                    for p in predictions
                                    if p.adm_2_geocode
                                )
                            )
                            selected_geocode = geocodes[0]
                        selected_model = model.id
                        line_charts_default_items.append(f"model={model.id}")
                        if not selected_series:
                            selected_series = model.type
                            if not selected_disease:
                                selected_disease = model.disease
                            if model.disease != selected_disease:
                                # TODO: Improve error handling
                                raise VisualizationError(
                                    "Two different diseases have been added "
                                    "to be visualized"
                                )

                    for prediction in charts[chart]:
                        if str(prediction.id) == prediction_id:
                            selected_series = prediction.model.type
                            selected_adm_level = model.ADM_level
                            selected_disease = model.disease
                            if chart == "LineChartADM2":
                                selected_geocode = prediction.adm_2_geocode
                            selected_model = model.id
                            selected_prediction = prediction.id

                            line_charts_default_items.append(
                                f"predict={prediction.id}"
                            )

        context["compatibilities"] = generate_models_compatibility_info(
            all_models, json_return=True
        )

        context["available_series"] = get_available_types(all_models)
        context["available_adm_levels"] = get_available_adm_levels(all_models)
        context["available_diseases"] = get_available_diseases(all_models)
        context["available_geocodes"] = get_available_adm_2_geocodes(
            all_models
        )

        context["selected_series"] = selected_series
        context["selected_adm_level"] = selected_adm_level
        context["selected_disease"] = selected_disease
        context["selected_geocode"] = selected_geocode
        context["selected_model"] = selected_model
        context["selected_prediction"] = selected_prediction

        context["line_charts_default_uri"] = "?" + "&".join(
            line_charts_default_items
        )

        return render(request, self.template_name, context)


class LineChartsView(View):
    template_name = "vis/charts/line-charts.html"

    def get(self, request):
        context = {}

        model_ids = request.GET.getlist("model")
        prediction_ids = request.GET.getlist("predict")

        predictions: set[Prediction] = set()

        if model_ids:
            if not prediction_ids:
                # Show "Please select Predictions"
                context["line_chart"] = []

        if prediction_ids:
            for id in prediction_ids:
                predict = get_object_or_404(Prediction, pk=id)
                predictions.add(predict)

        ids = []
        for prediction in predictions:
            ids.append(prediction.id)

        try:
            line_chart = line_charts_by_geocode(
                title="Forecast of dengue new cases",
                predictions_ids=ids,
                disease="dengue",
                width=500,
            )
            context["line_chart"] = line_chart.to_html()
        except Exception as e:
            # TODO: ADD HERE ERRORING PAGES TO BE RETURNED
            print(e)

        return render(request, self.template_name, context)


def get_available_types(models: list[Model]) -> list[str]:
    types = set()
    for model in models:
        if model.type:
            if any(model.get_visualizables()):
                types.add(model.type)
    return list(types)


def get_available_diseases(models: list[Model]) -> list[str]:
    diseases = set()
    for model in models:
        if model.disease:
            diseases.add(model.disease)
    return list(diseases)


def get_available_adm_levels(models: list[Model]) -> list[int]:
    levels = set()
    for model in models:
        if (
            model.ADM_level >= 0 or model.ADM_level <= 4
        ) and model.ADM_level is not None:
            levels.add(model.ADM_level)
    return list(levels)


def get_available_adm_2_geocodes(models: list[Model]) -> list[int]:
    geocodes = set()
    for model in models:
        if model.ADM_level == 2:
            predictions = Prediction.objects.filter(model=model)
            for prediction in predictions:
                if prediction.adm_2_geocode:
                    geocodes.add(prediction.adm_2_geocode)
    return list(geocodes)


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
            if model.type:
                if model.disease:
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
