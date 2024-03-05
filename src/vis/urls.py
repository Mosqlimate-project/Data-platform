from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("line-charts/", views.LineChartsView.as_view(), name="line_charts"),
    path(
        "predict-table/",
        views.PredictTableView.as_view(),
        name="predict_table",
    ),
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
    path(
        "get-geocode-info/<int:geocode>/",
        views.get_geocode_info,
        name="get_geocode_info",
    ),
]
