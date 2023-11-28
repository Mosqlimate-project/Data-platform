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

        disease: Literal["dengue", "zika", "chikungunya"] = ""
        diseases = ["dengue", "zika", "chikungunya"]

        available_diseases = set()
        available_geocodes = set()

        selected_series: Literal["spatial", "time"] = ""
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
            available_diseases.add(model.disease)
            if charts:
                for chart in charts:
                    if not disease:
                        disease = model.disease
                    if model.disease != disease:
                        # TODO: Improve error handling
                        raise VisualizationError(
                            "Two different diseases have been added to be "
                            "visualized"
                        )

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
                    else:
                        model_info["selected"] = "False"

                    model_info["predictions"] = []

                    for prediction in charts[chart]:
                        prediction_info = {}
                        prediction_info["id"] = prediction.id
                        prediction_info["model_id"] = model.id

                        if chart == "LineChartADM2":
                            available_geocodes.add(prediction.adm_2_geocode)
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

        context["compabilities"] = generate_models_compatibility_info(
            all_models, json_return=True
        )
        context["charts_info"] = charts_info
        context["series_info"] = series_info

        context["diseases"] = diseases
        context["geocodes"] = available_geocodes
        context["disease"] = disease

        context["selected_series"] = selected_series
        context["selected_geocodes"] = list(selected_geocodes)

        context["available_geocodes"] = list(available_geocodes)
        context["available_diseases"] = list(available_diseases)

        context["line_charts_default_uri"] = "?" + "&".join(
            line_charts_default_items
        )

        models = []
        for chart in charts_info:
            models.extend(charts_info[chart])

        context["models"] = models

        from pprint import pprint

        pprint(context["series_info"])
        pprint(context["compabilities"])

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
                info[_type][disease][adm_level.value] = defaultdict(
                    lambda: defaultdict(list)
                )

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

    if json_return:
        return json.dumps(info, cls=SetToListEncoder)

    return info


class SetToListEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)
