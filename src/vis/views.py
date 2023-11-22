from django.shortcuts import render, get_object_or_404
from django.views import View

from registry.models import Model, Prediction
from .dash.charts import line_charts_by_geocode


class VisualizationsView(View):
    template_name = "vis/index.html"

    def get(self, request):
        context = {}

        line_charts_default_items = []

        diseases = {"dengue": [], "zika": [], "chikungunya": []}

        model_ids = request.GET.getlist("model")
        prediction_ids = request.GET.getlist("predict")
        charts_info = {}

        all_models = Model.objects.all()
        for model in all_models:
            charts = model.get_visualizables()
            if charts:
                try:
                    diseases[model.disease].append(model.id)
                except KeyError:
                    pass

                for chart in charts:
                    model_info = {}
                    model_info["id"] = model.id
                    model_info["model"] = model

                    if str(model.id) in model_ids:
                        model_info["selected"] = True
                        line_charts_default_items.append(f"model={model.id}")
                    else:
                        model_info["selected"] = False

                    model_info["predictions"] = []

                    for prediction in charts[chart]:
                        prediction_info = {}
                        prediction_info["id"] = prediction.id
                        prediction_info["model_id"] = model.id
                        prediction_info["prediction"] = prediction

                        if (
                            str(prediction.id) in prediction_ids
                            or str(model.id) in model_ids
                        ):
                            model_info["selected"] = True
                            prediction_info["selected"] = True
                            line_charts_default_items.append(
                                f"predict={prediction.id}"
                            )
                        else:
                            prediction_info["selected"] = False

                        model_info["predictions"].append(prediction_info)

                    try:
                        charts_info[chart].append(model_info)
                    except KeyError:
                        charts_info[chart] = [model_info]

        context["diseases"] = diseases
        context["charts_info"] = charts_info
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
