import json
from typing import Literal
from itertools import combinations, combinations_with_replacement, chain
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

        line_charts_default_items = []

        model_ids = request.GET.getlist("model")
        prediction_ids = request.GET.getlist("predict")
        charts_info = {}
        diseases = ["dengue", "zika", "chikungunya"]
        disease: Literal["dengue", "zika", "chikungunya"] = ""

        all_models = Model.objects.all()
        geocodes = set()

        for model in all_models:
            charts = model.get_visualizables()
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
                    else:
                        model_info["selected"] = "False"

                    model_info["predictions"] = []

                    for prediction in charts[chart]:
                        prediction_info = {}
                        prediction_info["id"] = prediction.id
                        prediction_info["model_id"] = model.id

                        if chart == "LineChartADM2":
                            geocodes.add(prediction.adm_2_geocode)
                            prediction_info[
                                "geocode"
                            ] = prediction.adm_2_geocode

                        if (
                            str(prediction.id) in prediction_ids
                            or str(model.id) in model_ids
                        ):
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

        context["compabilities"] = generate_chart_compatibility_info(
            all_models, json_return=True
        )
        context["charts_info"] = charts_info
        context["diseases"] = diseases
        context["geocodes"] = geocodes
        context["disease"] = disease
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
            geocode=request.GET.get("geocode", 2304400),
            disease="dengue",
            width=500,
        )
        context["line_chart"] = line_chart.to_html()

        return render(request, self.template_name, context)


def generate_chart_compatibility_info(
    models: list[Model], json_return: bool = False
) -> dict[
    Literal["LineChartADM2",] : dict[int : dict[int : dict[int : set[int]]]]
    #                              m id      p id      m id      p ids
]:
    compabilities = {
        "LineChartADM2": (
            defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
        )
    }

    combs = combinations_with_replacement(models, 2)

    for model1, model2 in combs:
        if model1.is_compatible(model2):
            predictions1 = Prediction.objects.filter(model=model1)
            predictions2 = Prediction.objects.filter(model=model2)
            pcombs = combinations(set(chain(predictions1, predictions2)), 2)
            for p1, p2 in pcombs:
                if p1.is_compatible_line_chart_adm_2(p2):
                    compabilities["LineChartADM2"][p1.model.id][p1.id][
                        p2.model.id
                    ].add(p2.id)
                    compabilities["LineChartADM2"][p2.model.id][p2.id][
                        p1.model.id
                    ].add(p1.id)

    if json_return:
        return json.dumps(compabilities, cls=SetToListEncoder)

    return compabilities


class SetToListEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)
