from django.urls import path
from django.shortcuts import redirect
from django.conf import settings

from .api import api


def frontend(response):
    return redirect(settings.FRONTEND_URL)


def docs(response):
    url = settings.DOCS_URL
    if not url.endswith("/"):
        url += "/"
    return redirect(url)


urlpatterns = [
    # path("", frontend),
    path("api/", api.urls),
    path("docs/", docs, name="docs"),
]
