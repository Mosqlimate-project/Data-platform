from django.urls import path

from .views import VisualizationsView, LineChartsVisualizationsView

urlpatterns = [
    path("home/", VisualizationsView.as_view(), name="vis"),
    path(
        "line-charts/",
        LineChartsVisualizationsView.as_view(),
        name="line_charts",
    ),
]
