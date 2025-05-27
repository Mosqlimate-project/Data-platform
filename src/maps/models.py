from django.contrib.gis.db import models


class CentroidTest(models.Model):
    name = models.CharField(max_length=250)
    location = models.PointField()
