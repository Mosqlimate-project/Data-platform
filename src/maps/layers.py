from vectortiles import VectorLayer

from .models import CentroidTest, PolygonTest


class CentroidLayer(VectorLayer):
    model = CentroidTest
    id = "centroids"
    tile_fields = ("name",)
    geom_field = "location"
    min_zoom = 0


class PolygonLayer(VectorLayer):
    model = PolygonTest
    id = "polygons"
    tile_fields = ("name",)
    geom_field = "area"
    min_zoom = 0
