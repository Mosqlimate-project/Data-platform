import re
from datetime import date as dt
from datetime import datetime
from typing import Optional, Literal, List
from pydantic import model_validator, field_validator

from ninja import Field
from ninja.errors import HttpError

from main.schema import Schema


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
            values.lower_95
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
                422, "Prediction bounds are not in the correct order"
            )
        return values


class PredictionIn(Schema):
    """
    test
    """

    repository: str = Field(
        ...,
        description="The full repository name in 'owner/name' format.",
        examples="owner/repository-name",
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
    predict_date: dt = Field(
        ...,
        description="The reference date for this prediction (YYYY-MM-DD).",
        example="2023-10-25",
    )
    published: bool = Field(
        True, description="Whether this prediction is visible to the public."
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

    @model_validator(mode="before")
    def validate_adm_levels(cls, values):
        return values


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
    disease: str
    predictions: int
    last_update: float

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
    def resolve_disease(obj):
        return obj.disease.code

    @staticmethod
    def resolve_predictions(obj):
        return getattr(obj, "predictions_count", 0)

    @staticmethod
    def resolve_last_update(obj):
        return obj.updated.timestamp()


class ModelIncludeInit(Schema):
    repo_id: int
    repo_url: str
    repo_name: str
    repo_private: bool
    repo_provider: Literal["github", "gitlab"]
    repo_avatar_url: str | None = None
    disease_id: int
    time_resolution: Literal["day", "week", "month", "year"]
    adm_level: Literal[0, 1, 2, 3]
    category: Literal[
        "quantitative",
        "categorical",
        "spatial_quantitative",
        "spatial_categorical",
        "spatio_temporal_quantitative",
        "spatio_temporal_categorical",
    ]
    sprint: int


class ContributorOut(Schema):
    username: str
    avatar_url: str | None


class ModelOut(Schema):
    owner: str
    repository: str
    description: str | None
    disease: str
    category: str
    adm_level: int
    time_resolution: str
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
    def resolve_repository(obj):
        return obj.repository.name

    @staticmethod
    def resolve_disease(obj):
        return obj.disease.name

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
    published: bool
    created_at: datetime
    disease_code: str = Field(alias="model.disease.code")
    category: str = Field(alias="model.category")
    adm_level: int = Field(alias="model.adm_level")
    sprint: int | None
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
        return obj.predict_date

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
