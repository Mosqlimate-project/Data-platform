from vis.geo.layers import CityVectorLayer, StateVectorLayer
from vectortiles.views import MVTView, TileJSONView


class CityTileView(MVTView):
    layer_classes = [CityVectorLayer]


class CityAndStateBaseLayer:
    layer_classes = [CityVectorLayer, StateVectorLayer]
    prefix_url = "city-and-states"


class CityAndStateTileView(CityAndStateBaseLayer, MVTView):
    pass


class CityAndStateTileJSON(CityAndStateBaseLayer, TileJSONView):
    pass
