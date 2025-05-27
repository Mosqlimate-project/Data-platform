from django.contrib.gis.db import models


class CentroidTest(models.Model):
    name = models.CharField(max_length=250)
    location = models.PointField(srid=4326)


class PolygonTest(models.Model):
    name = models.CharField(max_length=250)
    area = models.PolygonField(srid=4326)


class MultipolygonTest(models.Model):
    name = models.CharField(max_length=250)
    geom = models.MultiPolygonField(srid=4326)
