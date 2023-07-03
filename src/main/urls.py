from django.urls import include, path, re_path
from django.views.generic.base import RedirectView

from . import views
from .api import api

urlpatterns = [
    path("", views.home, name="home"),
    path("api/", api.urls),
    re_path(
        r"accounts/signup/.*",
        RedirectView.as_view(url="/", permanent=False),
        name="index",
    ),
    re_path(
        r"accounts/email/.*",
        RedirectView.as_view(url="/", permanent=False),
        name="index",
    ),
    re_path(
        r"accounts/password/.*",
        RedirectView.as_view(url="/", permanent=False),
        name="index",
    ),
    re_path(
        r"accounts/login/.*",
        RedirectView.as_view(url="/accounts/github/login/", permanent=False),
        name="index",
    ),
    path("accounts/", include("allauth.urls")),
]
