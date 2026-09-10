from django.urls import path
from ninja import NinjaAPI
from maps.api import router

api = NinjaAPI()
api.add_router("", router)

urlpatterns = [
    path("maps/", api.urls),
]
