from django.urls import include, path

from . import views
from .api import api

urlpatterns = [
    path("about/", views.about, name="about"),
    path("docs/", views.docs, name="docs"),
    path("api/", api.urls),
    path("", views.home, name="home"),
    path("", include("users.urls")),
]
