from vectortiles import VectorLayer

from .models import CentroidTest


class CentroidLayer(VectorLayer):
    model = CentroidTest
    id = "centroids"
    tile_fields = "name"
    geom_field = "location"
    min_zoom = 0
