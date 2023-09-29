from django.urls import include, path

from . import views
from .api import api

urlpatterns = [
    path("models/", views.ModelsView.as_view(), name="models"),
    path("predictions/", views.predictions, name="predictions"),
    path("about/", views.about, name="about"),
    path("docs/", views.docs, name="docs"),
    path("api/", api.urls),
    path("", views.home, name="home"),
    path("", include("users.urls")),
]
