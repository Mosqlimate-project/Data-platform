from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.PredictionsDashboard.as_view(), name="dashboard"),
    path(
        "get-hist-alerta-data/",
        views.get_hist_alerta_data,
        name="get_hist_alerta_data",
    ),
    path("get-models/", views.get_models, name="get_models"),
    path("get-predictions/", views.get_predictions, name="get_predictions"),
    path("get-adm-names/", views.get_adm_names, name="get_adm_names"),
]
