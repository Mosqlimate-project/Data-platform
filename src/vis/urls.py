from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path(
        "dashboard/macro-forecast-map/",
        views.DashboardForecastMacroView.as_view(),
        name="dashboard_forecast_map",
    ),
    path("get-predict-ids/", views.get_predict_ids, name="get_predict_ids"),
    path(
        "get-predict-list-data/",
        views.get_predict_list_data,
        name="get_predict_list_data",
    ),
    path(
        "get-predicts-start-end-window-date/",
        views.get_predicts_start_end_window_date,
        name="get_predicts_start_end_window_date",
    ),
    path(
        "line-charts-base/",
        views.line_chart_base_view,
        name="line_charts_base",
    ),
    path(
        "line-charts-data-chart/",
        views.line_chart_data_view,
        name="line_charts_data",
    ),
    path(
        "line-charts-predicts-chart/",
        views.line_chart_predicts_view,
        name="line_charts_predicts",
    ),
    path(
        "macro-forecast-map/",
        views.MacroForecastMap.as_view(),
        name="macro_forecast_map",
    ),
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
    path("ibge/city/", views.get_city_info, name="get_city_info"),
]
