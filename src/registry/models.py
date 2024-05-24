import os
from datetime import datetime
from io import StringIO

import pandas as pd

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator

from vis.dash import errors
from vis.metadata import compose_prediction_metadata


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


class Tag(models.Model):
    name = models.CharField(max_length=30, unique=True)
    color = models.CharField(
        max_length=7,
        validators=[
            RegexValidator(
                regex=r"^#[0-9A-Fa-f]{6}$",
                message=_(
                    "Color must be in hexadecimal format, e.g., #ffffff"
                ),
            ),
        ],
        help_text=_("Color in hexadecimal format. E.g: #ffffff"),
    )

    def __str__(self):
        return self.name


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
    tags = models.ManyToManyField(Tag, related_name="tags")
    repository = models.CharField(max_length=100, null=False, blank=False)
    implementation_language = models.ForeignKey(
        ImplementationLanguage,
        on_delete=models.PROTECT,
        null=False,
        blank=False,
    )
    categorical = models.BooleanField(null=True, default=None)
    # Categorical: [S/T]-Categorical Series if True, [S/T]-Quantitative Series
    # if False ([Spatial/Temporal])
    spatial = models.BooleanField(null=True, default=None)
    temporal = models.BooleanField(null=True, default=None)
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
    visualizable = models.BooleanField(default=False)
    metadata = models.CharField(null=True, default=None)
    adm_0_geocode = models.CharField(max_length=3, null=True, default="BRA")
    adm_1_geocode = models.IntegerField(null=True, default=None)  # TODO
    adm_2_geocode = models.IntegerField(null=True, default=None)
    adm_3_geocode = models.IntegerField(null=True, default=None)  # TODO
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
            self._add_adm_geocode()
            self._add_ini_end_prediction_dates()
            self.visualizable = True
            self.metadata = compose_prediction_metadata(self)
            self.save()

    def _add_adm_geocode(self):
        level = self.model.ADM_level
        column = f"adm_{level}"

        try:
            code = self.prediction_df[column].unique()
        except KeyError:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError(f"{column} column not found")

        if len(code) != 1:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError(
                f"{column} values must contain only one code"
            )

        match level:
            case 0:
                self.adm_0_geocode = code[0]
            case 1:
                self.adm_1_geocode = code[0]
            case 2:
                self.adm_2_geocode = code[0]
            case 3:
                self.adm_3_geocode = code[0]

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
