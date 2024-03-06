from django.db import models
from django.contrib.gis.db import models as geomodels


class GeoMacroregion(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=1, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class GeoState(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=2, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class GeoMesoregion(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=4, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class GeoMicroregion(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=5, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class GeoCity(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=7, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class GeoMacroSaude(geomodels.Model):
    geocode = geomodels.IntegerField(
        primary_key=True, max_length=4, unique=True
    )
    geometry = geomodels.MultiPolygonField()


class Macroregion(models.Model):
    """
    geocode: 1 to 5
    """

    geocode = geomodels.IntegerField(
        primary_key=True, max_length=1, unique=True
    )
    name = models.CharField(null=False)
    geo = models.ForeignKey(GeoMacroregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"


class State(models.Model):
    """
    geocode: UF geocode
    """

    geocode = geomodels.IntegerField(
        primary_key=True, max_length=2, unique=True
    )
    name = models.CharField(null=False)
    uf = models.CharField(max_length=2, null=False)
    macroregion = models.ForeignKey(Macroregion, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoState, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"


class Mesoregion(models.Model):
    """
    geocode: UF geocode + inner code (format: 01)
    """

    geocode = geomodels.IntegerField(
        primary_key=True, max_length=4, unique=True
    )
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoMesoregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"


class Microregion(models.Model):
    """
    geocode: UF geocode + inner code (format: 001)
    """

    geocode = geomodels.IntegerField(
        primary_key=True, max_length=5, unique=True
    )
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoMicroregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"


class City(models.Model):
    """
    geocode: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
    """

    geocode = geomodels.IntegerField(
        primary_key=True, max_length=7, unique=True
    )
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoState, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"


class ResultsProbLSTM(models.Model):
    date = models.DateField(db_column="date", primary_key=True)
    macroregion = models.ForeignKey(GeoMacroSaude, on_delete=models.PROTECT)
    lower_2_5 = models.FloatField(null=False)
    lower_25 = models.FloatField(null=False)
    forecast = models.FloatField(null=False)
    upper_75 = models.FloatField(null=False)
    upper_97_5 = models.FloatField(null=False)
    prob_high = models.FloatField(null=False)
    prob_low = models.FloatField(null=False)
    HT = models.FloatField(null=False)
    LT = models.FloatField(null=False)
    HTinc = models.FloatField(null=False)
    LTinc = models.FloatField(null=False)

    class Meta:
        db_table = "results_prob_lstm"
