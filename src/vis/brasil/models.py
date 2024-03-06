from django.db import models
from django.contrib.gis.db import models as geomodels


class GeoMacroregion(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=1, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class GeoState(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=2, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class GeoMesoregion(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=4, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class GeoMicroregion(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=5, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class GeoCity(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=7, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class GeoMacroSaude(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=4, unique=True)
    geometry = geomodels.MultiPolygonField()

    class Meta:
        app_label = "vis"


class Macroregion(models.Model):
    """
    geocode: "1" to "5"
    """

    geocode = geomodels.CharField(primary_key=True, max_length=1, unique=True)
    name = models.CharField(null=False)
    geo = models.ForeignKey(GeoMacroregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"


class State(models.Model):
    """
    geocode: UF geocode (example: "33")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=2, unique=True)
    name = models.CharField(null=False)
    uf = models.CharField(max_length=2, null=False)
    macroregion = models.ForeignKey(Macroregion, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoState, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"


class Mesoregion(models.Model):
    """
    geocode: UF geocode + inner code (example: "3301")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=4, unique=True)
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoMesoregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"


class Microregion(models.Model):
    """
    geocode: UF geocode + inner code (example: "33001")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=5, unique=True)
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoMicroregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"


class City(models.Model):
    """
    geocode: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
    """

    geocode = geomodels.CharField(primary_key=True, max_length=7, unique=True)
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geo = models.ForeignKey(GeoState, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"


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
        app_label = "vis"
        db_table = "results_prob_lstm"
