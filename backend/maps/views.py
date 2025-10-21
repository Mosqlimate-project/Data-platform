from django.shortcuts import render
from vectortiles.views import MVTView

from .layers import CentroidLayer, PolygonLayer, MultipolygonLayer


class CentroidTileView(MVTView):
    layer_classes = [CentroidLayer]


class MultiLayerTileView(MVTView):
    layer_classes = [CentroidLayer, PolygonLayer, MultipolygonLayer]


def centroid_map(request):
    return render(request, "maps/centroid.html")


def multilayer_map(request):
    return render(request, "maps/multilayer.html")
