from django.shortcuts import render, get_object_or_404
from django.views import View

from registry.models import Model, Prediction
from .dash.charts import line_charts_by_geocode


class VisualizationsView(View):
    template_name = "vis/index.html"

    def get(self, request):
        context = {}
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
