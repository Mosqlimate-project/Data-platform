from django.contrib.gis.db import models


class CityTest(models.Model):
    name = models.CharField(max_length=250)
    city_code = models.CharField(max_length=10, unique=True)
    population = models.IntegerField(default=0)
    geom = models.MultiPolygonField(srid=4326)


class StateTest(models.Model):
    name = models.CharField(max_length=250)
    state_code = models.CharField(max_length=10, unique=True)
    geom = models.MultiPolygonField(srid=4326)
