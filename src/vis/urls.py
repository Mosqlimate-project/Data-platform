from django.urls import path

from .views import VisualizationsView, LineChartsView

urlpatterns = [
    path("home/", VisualizationsView.as_view(), name="vis"),
    path("line-charts/", LineChartsView.as_view(), name="line_charts"),
]
