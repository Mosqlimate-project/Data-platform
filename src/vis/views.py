from django.shortcuts import render, get_object_or_404
from django.views import View

from registry.models import Model, Prediction
from .dash.charts import line_charts_by_geocode


class VisualizationsView(View):
    template_name = "vis/index.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)


class LineChartsVisualizationsView(View):
    template_name = "vis/charts/line-charts.html"

    def get(self, request):
        get = request.GET.get
        context = {}

        model_id = get("model01")
        model = get_object_or_404(Model, pk=model_id)
        predicts = Prediction.objects.filter(model=model)
        predicts_ids = predicts.values_list("id", flat=True)

        line_chart = line_charts_by_geocode(
            title="Forecast of dengue new cases",
            predictions_ids=predicts_ids,
            geocode=get("geocode", 2304400),
            disease="dengue",
            width=500,
        )
        context["line_chart"] = line_chart.to_html()

        return render(request, self.template_name, context)
