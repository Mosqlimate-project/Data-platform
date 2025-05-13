from django.urls import path

from . import views
from .geo import views as geoviews

urlpatterns = [
    path("dashboard/", views.PredictionsDashboard.as_view(), name="dashboard"),
    path(
        "get-hist-alerta-data/",
        views.get_hist_alerta_data,
        name="get_hist_alerta_data",
    ),
    path("get-models/", views.get_models, name="get_models"),
    path("get-predictions/", views.get_predictions, name="get_predictions"),
    path("get-adm-names/", views.get_adm_names, name="get_adm_names"),
    # path(
    #     'cities/<int:z>/<int:x>/<int:y>.pbf',
    #     geoviews.GeoCityTileView.as_view(),
    #     name='city-tiles'
    # ),
    # path(
    #     'cities.json',
    #     geoviews.GeoCityTileJSONView.as_view(),
    #     name='city-tilejson'
    # ),
    path(
        "vis/cities/<int:z>/<int:x>/<int:y>.pbf",
        geoviews.CityTileView.as_view(),
        name="city-tile",
    ),
    path(
        "vis/city-state/<int:z>/<int:x>/<int:y>.pbf",
        geoviews.CityAndStateTileView.as_view(),
        name="city-state-tile",
    ),
    path(
        "vis/city-state/<int:z>/<int:x>/<int:y>.pbf",
        geoviews.CityAndStateTileView.as_view(),
        name="city-state-tile",
    ),
    path(
        "vis/city-state.json",
        geoviews.CityAndStateTileJSON.as_view(
            tiles_url=geoviews.CityAndStateTileView.get_url()
        ),
        name="city-state-tile-json",
    ),
]
