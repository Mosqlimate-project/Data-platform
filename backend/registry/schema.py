import re
from datetime import date as dt
from datetime import datetime, timedelta
from typing import Optional, Literal, List
from pydantic import model_validator, field_validator, ValidationInfo

from epiweeks import Week
import pandas as pd
from ninja import Field
from ninja.errors import HttpError
from django.db.models import Min, Max

from main.schema import Schema
from .models import ModelPrediction


class Model(Schema):
    id: int
    repository: str
    description: Optional[str] = ""
    category: str
    time_resolution: str
    sprint: Optional[int] = None
    predictions_count: int
    active: bool
    created_at: dt
    last_update: dt

    @staticmethod
    def resolve_repository(obj):
        if obj.repository.organization:
            owner = obj.repository.organization.name
        elif obj.repository.owner:
            owner = obj.repository.owner.username
        else:
            raise ValueError("Owner not found")

        return f"{owner}/{obj.repository.name}"

    @staticmethod
    def resolve_sprint(obj):
        return obj.sprint.year if obj.sprint else None

    @staticmethod
    def resolve_predictions_count(obj):
        return getattr(obj, "predictions_count", None) or obj.predicts.count()

    @staticmethod
    def resolve_active(obj):
        return obj.repository.active

    @staticmethod
    def resolve_created_at(obj):
        return obj.created.date()

    @staticmethod
    def resolve_last_update(obj):
        return obj.updated.date()


class Prediction(Schema):
    id: int
    model: Model
    disease: str
    commit: str
    description: str | None = ""
    start: dt | None = None
    end: dt | None = None
    scores: dict
    case_definition: str
    published: bool
    created_at: datetime
    adm_level: Literal[0, 1, 2, 3]
    adm_0: str | None
    adm_1: int | None = None
    adm_2: int | None = None
    adm_3: int | None = None

    @staticmethod
    def resolve_disease(obj):
        return obj.disease.code

    @staticmethod
    def resolve_start(obj):
        return (
            getattr(obj, "start_date", None)
            or obj.data.aggregate(d=Min("date"))["d"]
        )

    @staticmethod
    def resolve_end(obj):
        return (
            getattr(obj, "end_date", None)
            or obj.data.aggregate(d=Max("date"))["d"]
        )

    @staticmethod
    def resolve_adm_0(obj):
        return obj.adm0.geocode if obj.adm0 else None

    @staticmethod
    def resolve_adm_1(obj):
        return obj.adm1.geocode if obj.adm1 else None

    @staticmethod
    def resolve_adm_2(obj):
        return obj.adm2.geocode if obj.adm2 else None

    @staticmethod
    def resolve_adm_3(obj):
        return obj.adm3.geocode if obj.adm3 else None

    @staticmethod
    def resolve_scores(obj):
        child = getattr(obj, "quantitativeprediction", None)

        if not child:
            return {}

        score_fields = [
            "mae_score",
            "mse_score",
            "crps_score",
            "log_score",
            "interval_score",
            "wis_score",
        ]

        return {
            field: round(getattr(child, field), 2)
            for field in score_fields
            if getattr(child, field, None) is not None
        }


class PredictionData(Schema):
    date: dt
    lower_95: float | None = None
    lower_90: float
    lower_80: float | None = None
    lower_50: float | None = None
    pred: float
    upper_50: float | None = None
    upper_80: float | None = None
    upper_90: float
    upper_95: float | None = None


class PredictionDetail(Prediction):
    data: List[PredictionData]


class SprintOut(Schema):
    id: int
    year: int
    start_date: dt
    end_date: dt


class PredictionDataRowSchema(Schema):
    date: dt
    pred: float
    lower_95: float
    lower_90: float
    lower_80: float
    lower_50: float
    upper_50: float
    upper_80: float
    upper_90: float
    upper_95: float

    @model_validator(mode="after")
    def validate_bounds(cls, values):
        if not (
            0
            <= values.lower_95
            <= values.lower_90
            <= values.lower_80
            <= values.lower_50
            <= values.pred
            <= values.upper_50
            <= values.upper_80
            <= values.upper_90
            <= values.upper_95
        ):
            raise HttpError(
                422,
                (
                    "Prediction bounds are not in the correct order or "
                    "contain negative values"
                ),
            )
        return values


class PredictionIn(Schema):
    repository: str = Field(
        ...,
        description="The full repository name in 'owner/name' format.",
        examples="owner/repository-name",
    )
    disease: str = Field(
        description=(
            "The Disease code. Example: \n"
            "Dengue fever (classic): 'A90'\n"
            "Chikungunya fever: 'A92.0'"
        )
    )
    description: str = Field(
        "",
        description="A brief description of this specific prediction.",
    )
    commit: str = Field(
        ...,
        description="The full 40-character commit hash",
        examples="8843d7f92416211de9ebb963ff4ce28125932878",
        pattern=r"^[0-9a-fA-F]{40}$",
    )
    case_definition: Literal["reported", "probable"] = Field(
        "probable",
        description="The case definition used for the prediction data.",
    )
    published: bool = Field(
        True, description="Whether this prediction is visible to the public."
    )
    adm_level: Literal[0, 1, 2, 3] = Field(
        description=(
            "Administrative level: National (0), State (1),"
            " Municipality (2), Sub-municipality (3)"
        )
    )
    adm_0: str = Field("BRA", description="Country ISO code", examples="BRA")
    adm_1: Optional[int] = Field(
        None, description="State geocode", examples="33"
    )
    adm_2: Optional[int] = Field(
        None, description="Municipality geocode", examples="3304557"
    )
    adm_3: Optional[int] = Field(None, description="Sub-municipality geocode")
    prediction: List[PredictionDataRowSchema]

    @model_validator(mode="after")
    def validate_adm_hierarchy(self) -> "PredictionIn":
        if self.adm_level >= 0 and not self.adm_0:
            raise HttpError(
                422, "adm_0 is required for all administrative levels."
            )

        if self.adm_level >= 1 and self.adm_1 is None:
            raise HttpError(
                422, "adm_1 is required when adm_level is 1 or higher."
            )

        if self.adm_level >= 2 and self.adm_2 is None:
            raise HttpError(
                422, "adm_2 is required when adm_level is 2 or higher."
            )

        if self.adm_level >= 3 and self.adm_3 is None:
            raise HttpError(422, "adm_3 is required when adm_level is 3.")

        return self

    @model_validator(mode="after")
    def validate_prediction(self, info: ValidationInfo) -> "PredictionIn":
        context = info.context or {}
        time_res = context.get("time_resolution")
        is_sprint = context.get("is_sprint", False)

        if not self.prediction:
            raise HttpError(422, "Prediction list cannot be empty.")

        sorted_data = sorted(self.prediction, key=lambda x: x.date)
        dates = [p.date for p in sorted_data]

        if len(dates) != len(set(dates)):
            raise HttpError(422, "Duplicate dates found in predictions.")

        if is_sprint:
            df_dates = pd.to_datetime(dates)
            year = df_dates.year.max()

            expected_range = pd.date_range(
                start=Week(year - 1, 41).startdate(),
                end=Week(year, 40).startdate(),
                freq="W-SUN",
            )

            missing_dates = expected_range.difference(df_dates)

            if not missing_dates.empty:
                missing_str = ", ".join(missing_dates.strftime("%Y-%m-%d"))
                raise HttpError(
                    422,
                    (
                        "The following dates are missing from your"
                        f" predictions: {missing_str}."
                    ),
                )

        for i in range(len(dates) - 1):
            diff = dates[i + 1] - dates[i]
            if time_res == "week" and diff != timedelta(weeks=1):
                raise HttpError(
                    422,
                    (
                        "Gap detected: missing week "
                        f"between {dates[i]} and {dates[i + 1]}."
                    ),
                )
            elif time_res == "day" and diff != timedelta(days=1):
                raise HttpError(
                    422,
                    (
                        f"Gap detected: missing day between "
                        f"{dates[i]} and {dates[i + 1]}."
                    ),
                )

        for p in self.prediction:
            ew = Week.fromdate(p.date)
            if time_res == "week" and ew.startdate() != p.date:
                raise HttpError(
                    422,
                    (
                        f"Date {p.date} is not the start of CDC "
                        f"week {ew.week} (Sunday)."
                    ),
                )

        return self

    @field_validator("repository")
    @classmethod
    def validate_repository(cls, v):
        if "/" not in v:
            raise HttpError(422, "`repository` format: 'owner/repository'")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if len(v) == 0:
            raise HttpError(422, "`description` too short")
        if len(v) > 500:
            raise HttpError(422, "`description` too long. Max: 500 characters")
        return v

    @field_validator("commit")
    @classmethod
    def validate_commit(cls, v, values):
        if not re.fullmatch(r"^[0-9a-fA-F]{40}$", v):
            raise HttpError(422, "`commit` must be a full 40-character hash.")
        return v.lower()


class ModelSummary(Schema):
    id: int


class ModelTags(Schema):
    id: str
    name: str
    category: str
    models: List[ModelSummary]


class ModelThumbs(Schema):
    model_id: int
    owner: str
    repository: str
    avatar_url: Optional[str] = None
    diseases: List[str]
    predictions: int
    last_update: float
    category_display: Optional[str] = None
    time_resolution_display: Optional[str] = None
    adm_levels: List[str]
    imdc_year: Optional[str] = None

    @staticmethod
    def resolve_imdc_year(obj):
        if obj.sprint:
            return f"IMDC {obj.sprint.year}"
        return None

    @staticmethod
    def resolve_model_id(obj):
        return obj.id

    @staticmethod
    def resolve_owner(obj):
        if obj.repository.organization:
            return obj.repository.organization.name
        if obj.repository.owner:
            return obj.repository.owner.username
        raise ValueError("Repo owner not found")

    @staticmethod
    def resolve_repository(obj):
        return obj.repository.name

    @staticmethod
    def resolve_avatar_url(obj):
        if obj.avatar:
            return obj.avatar.url
        return None

    @staticmethod
    def resolve_diseases(obj):
        return list(
            obj.predicts.values_list("disease__code", flat=True).distinct()
        )

    @staticmethod
    def resolve_predictions(obj):
        return getattr(obj, "predictions_count", 0)

    @staticmethod
    def resolve_last_update(obj):
        return obj.updated.timestamp()

    @staticmethod
    def resolve_category_display(obj):
        return obj.get_category_display() if obj.category else None

    @staticmethod
    def resolve_time_resolution_display(obj):
        return (
            obj.get_time_resolution_display() if obj.time_resolution else None
        )

    @staticmethod
    def resolve_adm_levels(obj):
        levels = (
            obj.predicts.values_list("adm_level", flat=True)
            .distinct()
            .order_by("adm_level")
        )

        choices = dict(ModelPrediction.AdministrativeLevel.choices)

        return [str(choices.get(level, level)) for level in levels]


class ModelIncludeInit(Schema):
    repo_id: int
    repo_url: str
    repo_name: str
    repo_private: bool
    repo_provider: Literal["github", "gitlab"]
    repo_avatar_url: str | None = None
    time_resolution: Literal["day", "week", "month", "year"]
    category: Literal[
        "quantitative",
        "categorical",
        "spatial_quantitative",
        "spatial_categorical",
        "spatio_temporal_quantitative",
        "spatio_temporal_categorical",
    ]
    sprint: Optional[int] = None


class ContributorOut(Schema):
    username: str
    avatar_url: str | None


class ModelOut(Schema):
    owner: str
    repository: str
    description: str | None
    diseases: list[str]
    category: str
    time_resolution: str
    adm_levels: list[int]
    predictions: int
    contributors: list[ContributorOut]

    @staticmethod
    def resolve_owner(obj):
        if obj.repository.organization:
            return obj.repository.organization.name
        if obj.repository.owner:
            return obj.repository.owner.username
        raise ValueError("Owner not found")

    @staticmethod
    def resolve_diseases(obj):
        return list(
            obj.predicts.values_list("disease__code", flat=True).distinct()
        )

    @staticmethod
    def resolve_adm_levels(obj):
        return (
            obj.predicts.values_list("adm_level", flat=True)
            .distinct()
            .order_by("adm_level")
        )

    @staticmethod
    def resolve_repository(obj):
        return obj.repository.name

    @staticmethod
    def resolve_contributors(obj):
        users_map = {}
        repo = obj.repository

        for contributor in repo.repository_contributors.all():
            users_map[contributor.user.id] = contributor.user

        if repo.owner:
            users_map[repo.owner.id] = repo.owner

        return [
            {
                "username": user.username,
                "avatar_url": getattr(user, "avatar_url", None)
                or (
                    user.avatar.url
                    if hasattr(user, "avatar") and user.avatar
                    else None
                ),
            }
            for user in users_map.values()
        ]


class ModelDescriptionIn(Schema):
    description: str


class PredictionPublishUpdateIn(Schema):
    published: bool


class ModelPredictionOut(Schema):
    id: int
    date: dt
    commit: str
    description: str | None
    start: dt | None
    end: dt | None
    scores: list[dict]
    case_definition: str
    published: bool
    created_at: datetime
    disease_code: str = Field(alias="disease.code")
    category: str = Field(alias="model.category")
    sprint: int | None
    adm_level: int
    adm_0_name: str | None
    adm_0_code: str | None
    adm_1_name: str | None
    adm_1_code: int | None
    adm_2_name: str | None
    adm_2_code: int | None
    adm_3_name: str | None
    adm_3_code: int | None

    @staticmethod
    def resolve_date(obj):
        return obj.created_at.date()

    @staticmethod
    def resolve_sprint(obj):
        return obj.model.sprint.year if obj.model.sprint else None

    @staticmethod
    def resolve_adm_0_name(obj):
        return obj.adm0.name if obj.adm0 else None

    @staticmethod
    def resolve_adm_0_code(obj):
        return obj.adm0.geocode if obj.adm0 else None

    @staticmethod
    def resolve_adm_1_name(obj):
        return obj.adm1.name if obj.adm1 else None

    @staticmethod
    def resolve_adm_1_code(obj):
        return obj.adm1.geocode if obj.adm1 else None

    @staticmethod
    def resolve_adm_2_name(obj):
        return obj.adm2.name if obj.adm2 else None

    @staticmethod
    def resolve_adm_2_code(obj):
        return obj.adm2.geocode if obj.adm2 else None

    @staticmethod
    def resolve_adm_3_name(obj):
        return obj.adm3.name if obj.adm3 else None

    @staticmethod
    def resolve_adm_3_code(obj):
        return obj.adm3.geocode if obj.adm3 else None

    @staticmethod
    def resolve_scores(obj):
        score_fields = [
            "mae_score",
            "mse_score",
            "crps_score",
            "log_score",
            "interval_score",
            "wis_score",
        ]
        return [
            {"name": field, "score": getattr(obj, field, None)}
            for field in score_fields
            if getattr(obj, field, None) is not None
        ]


class RepositoryPermissions(Schema):
    is_owner: bool
    can_manage: bool


class CreatePredictionOut(Schema):
    id: int
