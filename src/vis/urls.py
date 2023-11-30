from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.VisualizationsView.as_view(), name="vis"),
    path("line-charts/", views.LineChartsView.as_view(), name="line_charts"),
    path(
        "get-model-item/<int:model_id>/",
        views.get_model_selector_item,
        name="get_model_selector_item",
    ),
    path(
        "get-prediction-item/<int:prediction_id>/",
        views.get_prediction_selector_item,
        name="get_prediction_selector_item",
    ),
]
