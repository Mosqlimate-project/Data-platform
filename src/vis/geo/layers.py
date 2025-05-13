from vectortiles import VectorLayer

from vis.geo.models import CityTest, StateTest


class CityVectorLayer(VectorLayer):
    # your model, as django conventions you can use queryset or get_queryset method instead)
    model = CityTest
    # layer id in you vector layer. each class attribute can be defined by get_{attribute} method
    id = "cities"
    tile_fields = ("city_code", "name")  # fields to include in tile
    # minimum zoom level to include layer. Take care of this, as it could be a performance issue. Try to not embed data that will no be shown in your style definition.
    min_zoom = 10


class StateVectorLayer(VectorLayer):
    model = StateTest
    id = "states"
    tile_fields = ("state_code", "name")
    min_zoom = 3
