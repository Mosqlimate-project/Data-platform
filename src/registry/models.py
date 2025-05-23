import os
import pandas as pd
import json
from typing import Literal
from datetime import datetime
from random import randrange as rr

from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _

from main.utils import UF_CODES
from vis.dash import errors
from vis.brasil.models import State, City


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


class Tag(models.Model):
    name = models.CharField(max_length=30, unique=True)
    group = models.CharField(unique=False, null=True)
    color = models.CharField(
        max_length=7,
        null=True,
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

    @staticmethod
    def random_rgb() -> str:
        return f"#{rr(255):02x}{rr(255):02x}{rr(255):02x}"

    @staticmethod
    def get_tag_ids_from_model_id(model_id: int) -> list[int]:
        return _get_tag_ids_from_model_id(model_id)

    @staticmethod
    def get_tag_id_by_implementation_language(
        implementation_language: Literal[
            "Python",
            "C++",
            "CoffeeScript",
            "C#",
            "C",
            ".NET",
            "Erlang",
            "Go",
            "Haskell",
            "JavaScript",
            "Java",
            "Kotlin",
            "Lua",
            "R",
            "Ruby",
            "Rust",
            "Zig",
        ],
    ) -> int:
        languages = list(
            ImplementationLanguage.objects.values_list("language", flat=True)
        )
        if str(implementation_language) not in languages:
            raise ValueError(
                f"Unknown programming language '{implementation_language}'"
            )
        try:
            return Tag.objects.get(name=implementation_language).id
        except Tag.DoesNotExist:
            pass

    @staticmethod
    def get_tag_id_by_disease(
        disease: Literal["dengue", "zika", "chikungunya"],
    ) -> int:
        disease = "chikungunya" if disease == "chik" else disease
        try:
            return Tag.objects.get(name=disease.capitalize()).id
        except Tag.DoesNotExist:
            pass

    @staticmethod
    def get_tag_id_by_time_resolution(
        time_resolution: Literal["day", "week", "month", "year"],
    ) -> int:
        times_res = {
            "day": "Daily",
            "week": "Weekly",
            "month": "Monthly",
            "year": "Yearly",
        }
        try:
            time_resolution = times_res[time_resolution]
            return Tag.objects.get(name=time_resolution).id
        except (Tag.DoesNotExist, KeyError):
            pass

    @staticmethod
    def get_tag_id_by_adm_level(adm_level: Literal[0, 1, 2, 3]) -> int:
        adm_levels = {
            0: "ADM 0",
            1: "ADM 1",
            2: "ADM 2",
            3: "ADM 3",
        }
        try:
            adm_level = adm_levels[adm_level]
            return Tag.objects.get(name=adm_level).id
        except (Tag.DoesNotExist, KeyError):
            pass


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
    tags = models.ManyToManyField(Tag, related_name="model_tags", default=[])
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
    adm_level = models.IntegerField(
        choices=ADM_levels.choices, null=True
    )  # TODO: Change to false
    time_resolution = models.CharField(
        choices=Periodicities.choices, null=True
    )  # TODO: change to false
    sprint = models.BooleanField(
        default=False,
        null=False,
        help_text=_("Model created to Sprint 2024/25"),
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = _("Model")
        verbose_name_plural = _("Models")


class Prediction(models.Model):
    model = models.ForeignKey(
        Model, on_delete=models.CASCADE, null=False, related_name="predictions"
    )
    description = models.TextField(max_length=500, null=True, blank=True)
    commit = models.CharField(max_length=100, null=False, blank=False)
    predict_date = models.DateField()
    tags = models.ManyToManyField(
        Tag, related_name="prediction_tags", default=[]
    )
    color = models.CharField(
        max_length=7,
        null=False,
        default="#000000",
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
    adm_1 = models.ForeignKey(
        State,
        null=True,
        default=None,
        on_delete=models.PROTECT,
        related_name="predictions",
    )
    adm_2 = models.ForeignKey(
        City,
        null=True,
        default=None,
        on_delete=models.PROTECT,
        related_name="predictions",
    )
    adm_0_geocode = models.CharField(max_length=3, null=True, default="BRA")
    adm_1_geocode = models.IntegerField(null=True, default=None)  # DEPRECATED
    adm_2_geocode = models.IntegerField(null=True, default=None)  # DEPRECATED
    adm_3_geocode = models.IntegerField(null=True, default=None)  # DEPRECATED
    date_ini_prediction = models.DateTimeField(null=True, default=None)
    date_end_prediction = models.DateTimeField(null=True, default=None)
    # scores
    mae = models.FloatField(null=True, default=None)
    mse = models.FloatField(null=True, default=None)
    crps = models.FloatField(null=True, default=None)
    log_score = models.FloatField(null=True, default=None)
    interval_score = models.FloatField(null=True, default=None)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    fields = [
        "date",
        "pred",
        "lower_95",
        "lower_90",
        "lower_80",
        "lower_50",
        "upper_50",
        "upper_80",
        "upper_90",
        "upper_95",
    ]

    def __str__(self):
        return f"{self.id}"

    def to_dataframe(self) -> pd.DataFrame:
        rows = self.data.all()

        if not rows:
            return pd.DataFrame()

        data = list(rows.values(*self.fields))

        return pd.DataFrame(data, columns=self.fields)

    def to_json(self) -> str:
        rows = self.data.all()

        if not rows:
            return "[]"

        data = json.loads(
            self.to_dataframe().to_json(orient="records", date_format="iso")
        )

        for row in data:
            row["date"] = str(datetime.fromisoformat(row["date"]).date())

        return json.dumps(data)

    @property
    def scores(self) -> dict:
        return {
            "mae": self.mae,
            "mse": self.mse,
            "crps": self.crps,
            "log_score": self.log_score,
            "interval_score": self.interval_score,
        }

    def _add_adm_geocode(self):
        level = self.model.adm_level
        column = f"adm_{level}"

        try:
            code = self.to_dataframe()[column].unique()
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
                if isinstance(code[0], str):
                    self.adm_1_geocode = self._parse_uf_geocode(code[0])
                elif isinstance(code[0], int):
                    if code[0] not in list(UF_CODES.values()):
                        raise errors.VisualizationError(
                            f"Unknow UF Code '{code[0]}'"
                        )
                    self.adm_1_geocode = code[0]
                else:
                    raise TypeError(
                        f"Incorrect type for adm_1 '{type(code[0])}'. ",
                        "Expects str (UF) or int (UF Code)",
                    )
            case 2:
                self.adm_2_geocode = code[0]
            case 3:
                self.adm_3_geocode = code[0]

    def _add_ini_end_prediction_dates(self):
        try:
            ini_date = min(self.to_dataframe()["date"])
            end_date = max(self.to_dataframe()["date"])
        except KeyError:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError("date column not found")

        try:
            self.date_ini_prediction = datetime.fromisoformat(str(ini_date))
            self.date_end_prediction = datetime.fromisoformat(str(end_date))
        except ValueError:
            # TODO: Improve error handling -> InsertionError
            raise errors.VisualizationError(
                "Incorrect date format on column date"
            )

    def _parse_uf_geocode(self, uf: str):
        uf = uf.upper()
        if uf not in UF_CODES:
            raise errors.VisualizationError(f"Unkown UF '{uf}'")
        return UF_CODES[uf]

    class Meta:
        verbose_name = _("Prediction")
        verbose_name_plural = _("Predictions")


class PredictionDataRow(models.Model):
    predict = models.ForeignKey(
        Prediction, on_delete=models.CASCADE, related_name="data", null=True
    )
    date = models.DateField(null=False)
    pred = models.FloatField(null=False)
    lower_95 = models.FloatField(null=True)
    lower_90 = models.FloatField(null=False)
    lower_80 = models.FloatField(null=True)
    lower_50 = models.FloatField(null=True)
    upper_50 = models.FloatField(null=True)
    upper_80 = models.FloatField(null=True)
    upper_90 = models.FloatField(null=False)
    upper_95 = models.FloatField(null=True)


def _get_tag_ids_from_model_id(model_id: int) -> list[int | None]:
    model = Model.objects.get(pk=model_id)
    tags = set(
        [
            Tag.get_tag_id_by_implementation_language(
                model.implementation_language
            ),
            Tag.get_tag_id_by_disease(model.disease),
            Tag.get_tag_id_by_adm_level(model.adm_level),
            Tag.get_tag_id_by_time_resolution(model.time_resolution),
        ]
    )
    if model.temporal and model.spatial:
        tags.add(Tag.objects.get(name="Spatio-Temporal").id)
    else:
        if model.temporal:
            tags.add(Tag.objects.get(name="Temporal").id)
        if model.spatial:
            tags.add(Tag.objects.get(name="Spatial").id)
    if model.categorical:
        tags.add(Tag.objects.get(name="Categorical").id)
    else:
        tags.add(Tag.objects.get(name="Quantitative").id)
    if model.sprint:
        tags.add(Tag.objects.get(name="Sprint2425").id)
    return list(tags)
