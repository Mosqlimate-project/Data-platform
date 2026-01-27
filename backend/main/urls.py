from django.urls import path
from django.shortcuts import redirect
from django.conf import settings

from .api import api


def frontend(response):
    return redirect(settings.FRONTEND_URL, code=302)


def docs(response):
    return redirect(settings.DOCS_URL, code=302)


urlpatterns = [
    path("", frontend),
    path("api/", api.urls),
    path("docs/", docs, name="docs"),
]
