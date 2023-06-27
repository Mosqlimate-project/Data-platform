from django.contrib import admin
from django.urls import include, path

from .api import api

urlpatterns = [
    path("api/", api.urls),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
]
