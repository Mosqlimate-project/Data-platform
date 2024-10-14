from django.urls import path

from . import views

urlpatterns = [
    path("model/<model_id>/", views.ModelView.as_view(), name="model"),
]
