from django.shortcuts import render
from vectortiles.views import MVTView

from .layers import CentroidLayer, PolygonLayer


class CentroidTileView(MVTView):
    layer_classes = [CentroidLayer]


class MultiLayerTileView(MVTView):
    layer_classes = [CentroidLayer, PolygonLayer]


def centroid_map(request):
    return render(request, "maps/centroid.html")


def multilayer_map(request):
    return render(request, "maps/multilayer.html")
