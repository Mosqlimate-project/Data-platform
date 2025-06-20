from vectortiles import VectorLayer

from .models import CentroidTest, PolygonTest, MultipolygonTest


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


class MultipolygonLayer(VectorLayer):
    model = MultipolygonTest
    id = "multipolygons"
    tile_fields = ("name",)
    geom_field = "geom"
    min_zoom = 0
