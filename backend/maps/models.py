from django.contrib.gis.db import models


class CentroidTest(models.Model):
    name = models.CharField(max_length=250)  # type: ignore[var-annotated]
    location = models.PointField(srid=4326)  # type: ignore[var-annotated]


class PolygonTest(models.Model):
    name = models.CharField(max_length=250)  # type: ignore[var-annotated]
    area = models.PolygonField(srid=4326)  # type: ignore[var-annotated]


class MultipolygonTest(models.Model):
    name = models.CharField(max_length=250)  # type: ignore[var-annotated]
    geom = models.MultiPolygonField(srid=4326)  # type: ignore[var-annotated]
