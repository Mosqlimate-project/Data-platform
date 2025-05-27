from django.urls import path

from . import views


urlpatterns = [
    path("centroid/", views.centroid_map, name="centroid_map"),
    path("multilayer/", views.multilayer_map, name="multilayer_map"),
]
