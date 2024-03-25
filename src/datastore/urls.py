from django.urls import path

from . import views

urlpatterns = [
    path("aedes-img-dataset/", views.aedes_egg_dataset_file),
]
