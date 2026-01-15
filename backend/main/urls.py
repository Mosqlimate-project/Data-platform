from django.urls import path
from django.shortcuts import redirect

from .api import api


def docs(response):
    return redirect("http://localhost:8043/", code=302)


urlpatterns = [
    path("api/", api.urls),
    path("docs/", docs, name="docs"),
]
