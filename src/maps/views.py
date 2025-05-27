from vectortiles.views import MVTView

from .models import CentroidTest


class CentroidTileView(MVTView):
    layer_classes = [CentroidTest]
