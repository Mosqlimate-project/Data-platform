import os
from datetime import datetime
from io import StringIO

import pandas as pd

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from vis.dash import errors


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


class ImplementationLanguage(models.Model):
    language = models.CharField(
        max_length=100, null=False, blank=False, unique=True
    )
    svg_path = models.FilePathField(
        path=get_plangs_path(), match=".svg$", null=True
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.language}"

    class Meta:
        verbose_name = _("Implementation Language")
        verbose_name_plural = _("Implementation Languages")


class Author(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
    )
    institution = models.CharField(max_length=100, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name}"

    class Meta:
        verbose_name = _("Author")
        verbose_name_plural = _("Authors")


class Model(models.Model):
    class Diseases(models.TextChoices):
        CHIKUNGUNYA = "chikungunya", _("Chikungunya")
        DENGUE = "dengue", _("Dengue")
        ZIKA = "zika", _("Zika")

    class Periodicities(models.TextChoices):
        DAY = "day", _("Day")
        WEEK = "week", _("Week")
        MONTH = "month", _("Month")
        YEAR = "year", _("Year")

    class ADM_levels(models.IntegerChoices):
        NATIONAL = 0, _("National")
        STATE = 1, _("State")
        MUNICIPALITY = 2, _("Municipality")
        SUB_MUNICIPALITY = 3, _("Sub Municipality")

    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, null=False, blank=False
    )
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    repository = models.CharField(max_length=100, null=False, blank=False)
    implementation_language = models.ForeignKey(
        ImplementationLanguage,
        on_delete=models.PROTECT,
        null=False,
        blank=False,
    )
    spatial = models.BooleanField(null=False, default=False)
    # Spatial: Spatial Series if True, Temporal Series if False
    categorical = models.BooleanField(null=False, default=False)
    # Categorical: [S/T]-Categorical Series if True, [S/T]-Quantitative Series
    # if False ([Spatial/Temporal])
    disease = models.CharField(
        choices=Diseases.choices, null=True
    )  # TODO: change to false
    ADM_level = models.IntegerField(
        choices=ADM_levels.choices, null=True
    )  # TODO: Change to false
    time_resolution = models.CharField(
        choices=Periodicities.choices, null=True
    )  # TODO: change to false
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = _("Model")
        verbose_name_plural = _("Models")


class Prediction(models.Model):
    model = models.ForeignKey(Model, on_delete=models.CASCADE, null=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    commit = models.CharField(max_length=100, null=False, blank=False)
    predict_date = models.DateField()
    prediction = models.JSONField(null=False, blank=True)
    # Metadata
    metadata = models.BooleanField(null=False, default=False)
    adm_2_geocode = models.IntegerField(null=True, default=None)
    date_ini_prediction = models.DateTimeField(null=True, default=None)
    date_end_prediction = models.DateTimeField(null=True, default=None)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    prediction_df: pd.DataFrame = pd.DataFrame()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        try:
            self.prediction_df = pd.read_json(StringIO(self.prediction))
        except (TypeError, AttributeError):
            self.prediction_df = pd.DataFrame()
        except Exception as e:
            raise errors.VisualizationError(e)

    def __str__(self):
        return f"{self.id}"

    def parse_metadata(self):
        if not self.prediction_df.empty:
            self._add_adm_2_geocode()
            self._add_ini_end_prediction_dates()
            self.metadata = True
            self.save()

    def _add_adm_2_geocode(self):
        if self.model.ADM_level == Model.ADM_levels.MUNICIPALITY:
            try:
                geocode = self.prediction_df["adm_2"].unique()
            except KeyError:
                # TODO: Improve error handling -> InsertionError
                raise errors.VisualizationError("adm_2 column not found")

            if len(geocode) != 1:
                # TODO: Improve error handling -> InsertionError
                raise errors.VisualizationError(
                    "adm_2 must have only one geocode"
                )

            self.adm_2_geocode = geocode[0]

    def _add_ini_end_prediction_dates(self):
        try:
            ini_date = min(self.prediction_df["dates"])
            end_date = max(self.prediction_df["dates"])
        except KeyError:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError("dates column not found")

        try:
            self.date_ini_prediction = datetime.fromisoformat(ini_date)
            self.date_end_prediction = datetime.fromisoformat(end_date)
        except ValueError:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError(
                "Incorrect date format on column dates"
            )

    class Meta:
        verbose_name = _("Prediction")
        verbose_name_plural = _("Predictions")
