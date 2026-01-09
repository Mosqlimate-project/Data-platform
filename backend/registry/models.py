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
from polymorphic.models import PolymorphicModel

from main.utils import UF_CODES
from main.models import TimestampModel
from datastore.models import Adm0, Adm1, Adm2, Adm3
from vis.brasil.models import State, City
from datastore.models import Disease


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


def random_rgb() -> str:
    return f"#{rr(255):02x}{rr(255):02x}{rr(255):02x}"


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
    active = models.BooleanField(default=False)

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
        "users.CustomUser",
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
    tags = models.ManyToManyField(
        Tag, related_name="model_tags", default=[]
    )  # TODO: remove it
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
    published = models.BooleanField(null=False, default=True)
    tags = models.ManyToManyField(
        Tag, related_name="prediction_tags", default=[]
    )  # TODO: Deprecate it
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
    date_ini_prediction = models.DateTimeField(null=True, default=None)
    date_end_prediction = models.DateTimeField(null=True, default=None)
    # scores
    mae = models.FloatField(null=True, default=None)
    mse = models.FloatField(null=True, default=None)
    crps = models.FloatField(null=True, default=None)
    log_score = models.FloatField(null=True, default=None)
    interval_score = models.FloatField(null=True, default=None)
    wis = models.FloatField(null=True, default=None)

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
            "mae": round(self.mae, 2) if self.mae else self.mae,
            "mse": round(self.mse, 2) if self.mse else self.mse,
            "crps": round(self.crps, 2) if self.crps else self.crps,
            "log_score": (
                round(self.log_score, 2) if self.log_score else self.log_score
            ),
            "interval_score": (
                round(self.interval_score, 2)
                if self.interval_score
                else self.interval_score
            ),
            "wis": round(self.wis, 2) if self.wis else self.wis,
        }

    def _add_ini_end_prediction_dates(self):
        try:
            ini_date = min(self.to_dataframe()["date"])
            end_date = max(self.to_dataframe()["date"])
        except KeyError:
            # TODO: Improve error handling -> InsertionError
            raise ValueError("date column not found")

        try:
            self.date_ini_prediction = datetime.fromisoformat(str(ini_date))
            self.date_end_prediction = datetime.fromisoformat(str(end_date))
        except ValueError:
            # TODO: Improve error handling -> InsertionError
            raise ValueError("Incorrect date format on column date")

    def _parse_uf_geocode(self, uf: str):
        uf = uf.upper()
        if uf not in UF_CODES:
            raise ValueError(f"Unkown UF '{uf}'")
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


# ---- Frontend new models:


class Sprint(models.Model):
    year = models.IntegerField()
    start_date = models.DateField(help_text="Start submission date")
    end_date = models.DateField(help_text="End submission date")

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"Sprint {self.year}"


class Organization(TimestampModel):
    name = models.CharField(max_length=100, unique=True)
    members = models.ManyToManyField(
        "users.CustomUser",
        through="OrganizationMembership",
        related_name="organizations",
        blank=True,
    )
    avatar = models.ImageField(
        upload_to="model_avatars/", null=True, blank=True
    )
    avatar_url = models.URLField(blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)


class OrganizationMembership(TimestampModel):
    class Roles(models.TextChoices):
        OWNER = "owner", _("Owner")
        MAINTAINER = "maintainer", _("Maintainer")
        CONTRIBUTOR = "contributor", _("Contributor")

    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=20, choices=Roles.choices, default="contributor"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "organization")


class RepositoryContributor(TimestampModel):
    class Permissions(models.TextChoices):
        ADMIN = "admin", "Admin"
        WRITE = "write", _("Write")

    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE)
    repository = models.ForeignKey(
        "Repository",
        on_delete=models.CASCADE,
        related_name="repository_contributors",
    )
    permission = models.CharField(max_length=10, choices=Permissions.choices)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "repository")


class Repository(TimestampModel):
    class Providers(models.TextChoices):
        GITHUB = "github", "GitHub"
        GITLAB = "gitlab", "GitLab"

    repo_id = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=10, choices=Providers.choices)
    owner = models.ForeignKey(
        "users.CustomUser",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repos",
    )
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repos",
    )
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "repo_id"],
                name="unique_repo_id_per_provider",
            ),
            models.UniqueConstraint(
                fields=["provider", "owner", "organization", "name"],
                name="unique_repo_name_context",
            ),
            models.CheckConstraint(
                check=(
                    (
                        models.Q(owner__isnull=False)
                        & models.Q(organization__isnull=True)
                    )
                    | (
                        models.Q(owner__isnull=True)
                        & models.Q(organization__isnull=False)
                    )
                ),
                name="repo_owner_or_org_xor",
            ),
        ]

    def __str__(self):
        owner = self.owner.username if self.owner else self.organization.name
        return f"{owner}/{self.name} ({self.provider})"


class RepositoryModel(TimestampModel):
    class Periodicity(models.TextChoices):
        DAY = "day", _("Day")
        WEEK = "week", _("Week")
        MONTH = "month", _("Month")
        YEAR = "year", _("Year")

    class AdministrativeLevel(models.IntegerChoices):
        NATIONAL = 0, _("National")
        STATE = 1, _("State")
        MUNICIPALITY = 2, _("Municipality")
        SUB_MUNICIPALITY = 3, _("Sub Municipality")

    class Category(models.TextChoices):
        QUANTITATIVE = "quantitative", _("Quantitative")
        CATEGORICAL = "categorical", _("Categorical")
        SPATIAL_QUANTITATIVE = "spatial_quantitative", _(
            "Spatial Quantitative"
        )
        SPATIAL_CATEGORICAL = "spatial_categorical", _("Spatial Categorical")
        SPATIO_TEMPORAL_QUANTITATIVE = (
            "spatio_temporal_quantitative",
            _("Spatio-temporal Quantitative"),
        )
        SPATIO_TEMPORAL_CATEGORICAL = (
            "spatio_temporal_categorical",
            _("Spatio-temporal Categorical"),
        )

        @property
        def meta(self):
            return self.CategoryMeta[self.value]

        @property
        def help_text(self):
            m = self.meta
            return f"Domain: {m['domain']} | Output: {m['output']} | Ex: {
                m['example']
            }"

    Category.CategoryMeta = {
        Category.QUANTITATIVE: {
            "domain": _("Time"),
            "output": _("Numeric (vectorial or scalar)"),
            "example": _("Time series"),
            "description": _("Models that output numeric values over time."),
        },
        Category.CATEGORICAL: {
            "domain": _("Time"),
            "output": _("Single or Multiple Categories"),
            "example": _("Alert levels"),
            "description": _("Models that classify status over time."),
        },
        Category.SPATIAL_QUANTITATIVE: {
            "domain": _("Space"),
            "output": _("Numerical values"),
            "example": _("Choropleth maps"),
            "description": _(
                "Models that output numeric values across a geographical area."
            ),
        },
        Category.SPATIAL_CATEGORICAL: {
            "domain": _("Space"),
            "output": _("Single or Multiple Categories"),
            "example": _("Choropleth maps (Categorical)"),
            "description": _("Models that classify regions into categories."),
        },
        Category.SPATIO_TEMPORAL_QUANTITATIVE: {
            "domain": _("Time and Space"),
            "output": _("Numeric"),
            "example": _("Animated maps"),
            "description": _(
                "Models that predict numeric values across both time and space."
            ),
        },
        Category.SPATIO_TEMPORAL_CATEGORICAL: {
            "domain": _("Time and Space"),
            "output": _("Maps and Categories"),
            "example": _("Animated maps (Categorical)"),
            "description": _("Models that classify regions over time."),
        },
    }

    repository = models.OneToOneField(
        Repository, on_delete=models.CASCADE, related_name="model"
    )
    disease = models.ForeignKey(
        Disease, related_name="models", on_delete=models.PROTECT
    )
    description = models.TextField(max_length=500, null=True, blank=True)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        help_text=_(
            "The forecasting model category based on domain and output type."
        ),
    )
    adm_level = models.IntegerField(choices=AdministrativeLevel.choices)
    time_resolution = models.CharField(
        max_length=10, choices=Periodicity.choices
    )
    sprint = models.ForeignKey(
        Sprint, null=True, on_delete=models.PROTECT, default=None
    )

    def __str__(self):
        return f"{self.repository.name} ({self.get_category_display()})"

    class Meta:
        verbose_name = _("Model")
        verbose_name_plural = _("Models")


class ModelPrediction(PolymorphicModel):
    model = models.ForeignKey(
        RepositoryModel,
        on_delete=models.CASCADE,
        related_name="predicts",
    )
    adm0 = models.ForeignKey(
        Adm0, null=True, blank=True, on_delete=models.PROTECT
    )
    adm1 = models.ForeignKey(
        Adm1, null=True, blank=True, on_delete=models.PROTECT
    )
    adm2 = models.ForeignKey(
        Adm2, null=True, blank=True, on_delete=models.PROTECT
    )
    adm3 = models.ForeignKey(
        Adm3, null=True, blank=True, on_delete=models.PROTECT
    )
    commit = models.CharField(max_length=100)
    description = models.TextField(max_length=500, null=True, blank=True)
    predict_date = models.DateField()
    published = models.BooleanField(null=False, default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class QuantitativePrediction(ModelPrediction):
    mae_score = models.FloatField(null=True, default=None)
    mse_score = models.FloatField(null=True, default=None)
    crps_score = models.FloatField(null=True, default=None)
    log_score = models.FloatField(null=True, default=None)
    interval_score = models.FloatField(null=True, default=None)
    wis_score = models.FloatField(null=True, default=None)


class QuantitativePredictionRow(models.Model):
    prediction = models.ForeignKey(
        QuantitativePrediction, on_delete=models.CASCADE, related_name="data"
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

    class Meta:
        ordering = ["date"]
        indexes = [
            models.Index(fields=["prediction", "date"]),
        ]
