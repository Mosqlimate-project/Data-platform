from django.db import models
from django.contrib.gis.db import models as geomodels
from django.contrib.gis.geos import GEOSGeometry


class Macroregion(models.Model):
    """
    geocode: "1" to "5"
    """

    geocode = geomodels.CharField(primary_key=True, max_length=1, unique=True)
    name = models.CharField(null=False)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"
        db_table = "brasil_macroregions"


class State(models.Model):
    """
    geocode: UF geocode (example: "33")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=2, unique=True)
    name = models.CharField(null=False)
    uf = models.CharField(max_length=2, null=False)
    macroregion = models.ForeignKey(Macroregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"
        db_table = "brasil_states"


class Mesoregion(models.Model):
    """
    geocode: UF geocode + inner code (example: "3301")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=4, unique=True)
    name = models.CharField(null=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"
        db_table = "brasil_mesoregions"


class Microregion(models.Model):
    """
    geocode: UF geocode + inner code (example: "33001")
    """

    geocode = geomodels.CharField(primary_key=True, max_length=5, unique=True)
    name = models.CharField(null=False)
    mesoregion = models.ForeignKey(Mesoregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"
        db_table = "brasil_microregions"


class City(models.Model):
    """
    geocode: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
    """

    geocode = geomodels.CharField(primary_key=True, max_length=7, unique=True)
    name = models.CharField(null=False)
    microregion = models.ForeignKey(Microregion, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        app_label = "vis"
        db_table = "brasil_cities"


# -----------------------------------------------------------------------------
# GeoDjango Models


class GeoMacroregion(geomodels.Model):
    macroregion = geomodels.ForeignKey(
        Macroregion, on_delete=geomodels.PROTECT
    )
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_macroregions"


class GeoState(geomodels.Model):
    state = geomodels.ForeignKey(State, on_delete=geomodels.PROTECT)
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_states"


class GeoMesoregion(geomodels.Model):
    mesoregion = geomodels.ForeignKey(Mesoregion, on_delete=geomodels.PROTECT)
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_mesoregions"


class GeoMicroregion(geomodels.Model):
    microregion = geomodels.ForeignKey(
        Microregion, on_delete=geomodels.PROTECT
    )
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_microregions"


class GeoCity(geomodels.Model):
    city = geomodels.ForeignKey(City, on_delete=geomodels.PROTECT)
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_cities"


class GeoMacroSaude(geomodels.Model):
    geocode = geomodels.CharField(primary_key=True, max_length=4, unique=True)
    state = models.ForeignKey(State, on_delete=models.PROTECT)
    geometry = geomodels.GeometryField(null=False)

    def save(self, *args, **kwargs):
        self.geometry = GEOSGeometry(self.geometry.wkt)
        super().save(*args, **kwargs)

    class Meta:
        app_label = "vis"
        db_table = "geo_brasil_macro_saude"


# -----------------------------------------------------------------------------


class ResultsProbForecast(models.Model):
    date = models.DateField(db_column="date")
    geocode = models.ForeignKey(GeoMacroSaude, on_delete=models.PROTECT)
    lower_2_5 = models.FloatField(null=False)
    lower_25 = models.FloatField(null=False)
    forecast = models.FloatField(null=False)
    upper_75 = models.FloatField(null=False)
    upper_97_5 = models.FloatField(null=False)
    prob_high = models.FloatField(null=False)
    prob_low = models.FloatField(null=False)
    high_threshold = models.FloatField(null=False)
    low_threshold = models.FloatField(null=False)
    high_incidence_threshold = models.FloatField(null=False)
    low_incidence_threshold = models.FloatField(null=False)

    class Meta:
        app_label = "vis"
        db_table = "results_prob_forecast"
        constraints = [
            models.UniqueConstraint(
                fields=["date", "geocode"], name="results_prob_forecast_unique"
            )
        ]
