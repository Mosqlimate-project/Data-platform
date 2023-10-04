from django.urls import include, path

from . import views
from .api import api

urlpatterns = [
    path("models/", views.ModelsView.as_view(), name="models"),
    path("edit-model/<model_id>/", views.EditModelView.as_view(), name="edit-model"),
    path("predictions/", views.PredictionsView.as_view(), name="predictions"),
    path(
        "edit-prediction/<prediction_id>/",
        views.EditPredictionView.as_view(),
        name="edit-prediction",
    ),
    path("about/", views.about, name="about"),
    path("docs/", views.docs, name="docs"),
    path("api/", api.urls),
    path("", views.home, name="home"),
    path("", include("users.urls")),
]
