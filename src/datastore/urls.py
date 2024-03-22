from django.urls import path

from . import views

urlpatterns = [
    path("aedes-imgs-dataset/", views.aedes_egg_dataset_file),
]
