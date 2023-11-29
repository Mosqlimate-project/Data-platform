import json
from typing import Literal
from collections import defaultdict

from django.shortcuts import render, get_object_or_404
from django.views import View

from registry.models import Model, Prediction
from .dash.errors import VisualizationError
from .dash.charts import line_charts_by_geocode


class VisualizationsView(View):
    template_name = "vis/dashboard.html"

    def get(self, request):
        context = {}

        model_ids = request.GET.getlist("model")
        prediction_ids = request.GET.getlist("predict")

        all_models = Model.objects.all()

        diseases = ["dengue", "zika", "chikungunya"]

        selected_series: Literal["spatial", "time"] = ""
        selected_adm_level: int = None
        selected_disease: Literal["dengue", "zika", "chikungunya"] = ""
        selected_geocodes: set[int] = set()

        series_info = {
            "time": {
                "dengue": [],
                "zika": [],
                "chikungunya": [],
            },
            "spatial": {
                "dengue": [],
                "zika": [],
                "chikungunya": [],
            },
        }
        charts_info = {}
        line_charts_default_items = []

        for model in all_models:
            if model.type in ["spatial", "time"]:
                if model.disease in diseases:
                    series_info[model.type][model.disease].append(model.id)

            charts = model.get_visualizables()
            if charts:
                for chart in charts:
                    model_info = {}
                    model_info["id"] = model.id
                    model_info["disease"] = model.disease

                    if str(model.id) in model_ids:
                        model_info["selected"] = "True"
                        line_charts_default_items.append(f"model={model.id}")
                        if not selected_series:
                            selected_series = model.type
                        else:
                            # TODO: Improve error handling
                            raise VisualizationError(
                                "Two different Model types have been added "
                                "to be visualized"
                            )

                            if not selected_disease:
                                selected_disease = model.disease
                            if model.disease != selected_disease:
                                # TODO: Improve error handling
                                raise VisualizationError(
                                    "Two different diseases have been added "
                                    "to be visualized"
                                )

                    else:
                        model_info["selected"] = "False"

                    model_info["predictions"] = []

                    for prediction in charts[chart]:
                        prediction_info = {}
                        prediction_info["id"] = prediction.id
                        prediction_info["model_id"] = model.id

                        if chart == "LineChartADM2":
                            prediction_info[
                                "geocode"
                            ] = prediction.adm_2_geocode

                        if (
                            str(prediction.id) in prediction_ids
                            or str(model.id) in model_ids
                        ):
                            if not selected_series:
                                selected_series = prediction.model.type
                            if selected_series != prediction.model.type:
                                raise VisualizationError(
                                    "Two different Model types have been added "
                                    "to be visualized"
                                )

                            if not selected_adm_level:
                                selected_adm_level = model.ADM_level

                            if selected_adm_level != model.ADM_level:
                                # TODO: Improve error handling
                                raise VisualizationError(
                                    "Two different ADM_level were added to be "
                                    "visualized"
                                )

                            if not selected_disease:
                                selected_disease = model.disease
                            if model.disease != selected_disease:
                                # TODO: Improve error handling
                                raise VisualizationError(
                                    "Two different diseases have been added "
                                    "to be visualized"
                                )

                            selected_geocodes.add(prediction.adm_2_geocode)

                            model_info["selected"] = "True"
                            prediction_info["selected"] = "True"
                            line_charts_default_items.append(
                                f"predict={prediction.id}"
                            )
                        else:
                            prediction_info["selected"] = "False"

                        model_info["predictions"].append(prediction_info)

                    try:
                        charts_info[chart].append(model_info)
                    except KeyError:
                        charts_info[chart] = [model_info]

        context["compatibilities"] = generate_models_compatibility_info(
            all_models, json_return=True
        )
        context["charts_info"] = charts_info
        context["series_info"] = series_info

        context["selected_series"] = selected_series
        context["selected_adm_level"] = selected_adm_level
        context["selected_disease"] = selected_disease
        context["selected_geocodes"] = list(selected_geocodes)

        context["available_series"] = get_available_types(all_models)
        context["available_adm_levels"] = get_available_adm_levels(all_models)
        context["available_diseases"] = get_available_diseases(all_models)
        context["available_geocodes"] = get_available_adm_2_geocodes(
            all_models
        )

        context["line_charts_default_uri"] = "?" + "&".join(
            line_charts_default_items
        )

        models = []
        for chart in charts_info:
            models.extend(charts_info[chart])

        context["models"] = models

        return render(request, self.template_name, context)


class LineChartsView(View):
    template_name = "vis/charts/line-charts.html"

    def get(self, request):
        context = {}

        model_ids = request.GET.getlist("model")
        prediction_ids = request.GET.getlist("predict")

        predictions: set[Prediction] = set()

        if model_ids:
            for id in model_ids:
                model = get_object_or_404(Model, pk=id)
                predicts = Prediction.objects.filter(model=model)
                predictions |= set(predicts)

        if prediction_ids:
            for id in prediction_ids:
                predict = get_object_or_404(Prediction, pk=id)
                predictions.add(predict)

        ids = []
        for prediction in predictions:
            ids.append(prediction.id)

        line_chart = line_charts_by_geocode(
            title="Forecast of dengue new cases",
            predictions_ids=ids,
            disease="dengue",
            width=500,
        )
        context["line_chart"] = line_chart.to_html()

        return render(request, self.template_name, context)


def get_available_types(models: list[Model]) -> list[str]:
    types = set()
    for model in models:
        if model.type:
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
