from django.urls import include, path

from . import views
from .api import api

urlpatterns = [
    path("", views.home, name="home"),
    path("", include("users.urls")),
    path("api/", api.urls),
]
