from django.urls import path

from . import views

urlpatterns = [
    path("model/<model_id>/", views.ModelView.as_view(), name="model"),
    path(
        "prediction/<prediction_id>/",
        views.PredictionView.as_view(),
        name="prediction",
    ),
]
