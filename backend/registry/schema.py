import requests
from typing_extensions import Annotated
from datetime import date as dt
from typing import Optional, Literal, List
from pydantic import validator, model_validator, field_validator

import pandas as pd
from ninja import Field, FilterSchema
from ninja.errors import HttpError

from main.schema import Schema
from users.schema import UserSchema
from vis.brasil.models import State, City
from vis.schema import PredictionScore
from .models import Model


class ImplementationLanguageSchema(Schema):
    language: Annotated[
        str,
        Field(
            default="python",
            max_length=50,
            description="Implementation Language",
        ),
    ]


class AuthorSchema(Schema):
    user: UserSchema
    institution: Annotated[
        Optional[str],
        Field(default="", max_length=100, description="Author's association"),
    ]


class AuthorFilterSchema(FilterSchema):
    """url/?paremeters to search for Authors"""

    name: Annotated[
        str,
        Field(
            None, q="user__name__icontains", description="Author's full name"
        ),
    ]
    institution: Annotated[
        str,
        Field(
            default=None,
            q="institution__icontains",
            max_length=100,
            description="Author's association",
        ),
    ]
    username: Annotated[
        str,
        Field(
            default=None,
            q="user__username__icontains",
            description="Author's username",
        ),
    ]


class TagSchema(Schema):
    id: Annotated[
        Optional[int],
        Field(
            default=None,
            description="Tag ID",
            gt=0,
        ),
    ]
    name: str
    color: str

    @validator("id", pre=True, always=True)
    def convert_id(cls, value):
        if value is not None:
            try:
                return int(value)
            except ValueError:
                raise ValueError("Tag ID must be an integer")
        return value


class ModelSchema(Schema):
    id: Annotated[
        Optional[int],
        Field(
            default=None,
            description="Model ID",
            gt=0,
        ),
    ]
    name: Annotated[str, Field(description="Model name")]
    description: Annotated[
        str,
        Field(
            description="Model description",
            max_length=500,
        ),
    ]
    author: AuthorSchema
    repository: Annotated[
        str,
        Field(
            default="https://github.com/",
            description="Model git repository",
        ),
    ]
    implementation_language: ImplementationLanguageSchema
    disease: Annotated[
        Literal["dengue", "chikungunya", "zika"],
        Field(default="dengue", description="Model for disease"),
    ]
    categorical: bool | None = None
    spatial: bool | None = None
    temporal: bool | None = None
    adm_level: Annotated[
        Literal[0, 1, 2, 3],
        Field(
            default=0,
            description=(
                "Administrative level. Country, State, Municipality and "
                "SubMunicipality respectively"
            ),
        ),
    ]
    time_resolution: Annotated[
        Literal["day", "week", "month", "year"],
        Field(
            default="week",
            description=(
                "Time resolution. Options: 'day', 'week', 'month' or 'year'"
            ),
        ),
    ]
    sprint: Annotated[
        bool,
        Field(
            default=False,
            description="Model for Sprint 2024/25",
        ),
    ]


class ModelFilterSchema(FilterSchema):
    """url/?paremeters to search for Models"""

    id: Annotated[
        Optional[int],
        Field(
            default=None,
            q="id__exact",
            description="Model ID",
            gt=0,
        ),
    ]
    name: Annotated[
        Optional[str],
        Field(
            default=None,
            q="name__icontains",
            description="Model name",
        ),
    ]
    author_name: Annotated[
        Optional[str],
        Field(
            default=None,
            q="author__user__name__icontains",
            description="Model's Author full name",
        ),
    ]
    author_username: Annotated[
        Optional[str],
        Field(
            default=None,
            q="author__user__username__icontains",
            description="Model's Author username",
        ),
    ]
    author_institution: Annotated[
        Optional[str],
        Field(
            default=None,
            q="author__institution__icontains",
            description="Model's Author association",
        ),
    ]
    repository: Annotated[
        Optional[str],
        Field(
            default=None,
            q="repository__icontains",
            description="Model git repository",
        ),
    ]
    implementation_language: Annotated[
        Optional[str],
        Field(
            default=None,
            q="implementation_language__language__iexact",
            description="Model implementation language",
        ),
    ]
    disease: Annotated[
        Optional[Literal["dengue", "zika", "chikungunya"]],
        Field(
            default=None, q="disease__iexact", description="Model for disease"
        ),
    ]
    adm_level: Annotated[
        Optional[Literal[0, 1, 2, 3]],
        Field(
            default=None,
            q="adm_level",
            description=(
                "Administrative level. Country, State, Municipality and "
                "SubMunicipality respectively"
            ),
        ),
    ]
    temporal: Optional[bool] = Field(None, q="temporal")
    spatial: Optional[bool] = Field(None, q="spatial")
    categorical: Optional[bool] = Field(None, q="categorical")
    time_resolution: Annotated[
        Optional[Literal["day", "week", "month", "year"]],
        Field(
            default=None,
            q="time_resolution__iexact",
            description=(
                "Time resolution. Options: 'day', 'week', 'month' or 'year'"
            ),
        ),
    ]
    tags: Annotated[
        Optional[List[int]],
        Field(
            default=None,
            q="tags__id__in",
            description="List of Model tags",
        ),
    ]
    sprint: Annotated[
        Optional[bool],
        Field(
            default=None, q="sprint", description="Model for Sprint 2024/25"
        ),
    ]


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
            raise ValueError("Prediction bounds are not in the correct order")
        return values


class PredictionIn(Schema):
    model: int
    description: str = ""
    commit: str
    predict_date: dt  # YYYY-mm-dd
    published: bool = True
    # adm_0: str = "BRA"
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None
    # adm_3: Optional[int] = None
    prediction: List[PredictionDataRowSchema]

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        try:
            Model.objects.get(pk=v)
            return v
        except Model.DoesNotExist:
            raise HttpError(404, f"Model '{v}' not found")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if len(v) == 0:
            raise HttpError(422, "Description too short")
        if len(v) > 500:
            raise HttpError(422, "Description too long. Max: 500 characters")
        return v

    @field_validator("commit")
    @classmethod
    def validate_commit(cls, v, values):
        repository = Model.objects.get(pk=values.data.get("model")).repository
        url = (
            repository + f"commit/{v}"
            if repository.endswith("/")
            else repository + f"/commit/{v}"
        )
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 404:
                raise HttpError(422, f"Failed to fetch commit: {url}")
            response.raise_for_status()
        except requests.RequestException as e:
            raise HttpError(422, e)
        return v

    @field_validator("prediction")
    @classmethod
    def validate_prediction(cls, v):
        if not v:
            raise HttpError(422, "Empty prediction data")
        try:
            data = [row.dict() for row in v]
            pd.DataFrame(data=data)
        except Exception as e:
            raise HttpError(422, f"Unprocessable prediction data. Error: {e}")
        return v

    @model_validator(mode="before")
    def validate_adm_levels(cls, values):
        try:
            model = Model.objects.get(pk=values.model)
        except Model.DoesNotExist:
            raise HttpError(404, f"Model '{values.model}' not found")
        adm_1 = values.adm_1
        adm_2 = values.adm_2
        # adm_3 = values.adm_3

        if sum(list(map(bool, [adm_1, adm_2]))) != 1:
            raise ValueError(
                "[only] one of `adm_1`, `adm_2` or `adm_3` param is required"
            )

        if adm_1:
            adm_1 = adm_1.upper()
            if adm_1 not in list(
                State.objects.all().values_list("uf", flat=True)
            ):
                raise ValueError(f"unkown UF '{adm_1}'. Format: 'RJ'")

        if adm_2:
            if model.adm_level == 1:
                raise ValueError(f"Model {model.id} ADM Level is 1")
            try:
                City.objects.get(geocode=adm_2)
            except City.DoesNotExist:
                raise ValueError(f"unkown geocode '{adm_2}'. Format: 3304557")

        # if adm_3:
        #     raise NotImplementedError(
        #         "ADM 3 (Submunicipality) is not yet implemented. "
        #         "Please contact the moderation"
        #     )

        return values


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


class ModelOut(Schema):
    owner: str
    repository: str
    description: str | None
    disease: str
    category: str
    adm_level: int
    time_resolution: str

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


class ModelPredictionOut(Schema):
    id: int
    date: dt
    commit: str
    adm_0: Optional[str] = None
    adm_1: Optional[str] = None
    adm_2: Optional[str] = None
    adm_3: Optional[str] = None
    description: Optional[str] = None
    start: Optional[dt] = None
    end: Optional[dt] = None
    sprint: Optional[int] = None
    scores: list[PredictionScore]
    published: Optional[bool] = None

    @staticmethod
    def resolve_date(obj):
        return obj.predict_date

    @staticmethod
    def resolve_adm_0(obj):
        return obj.adm0.name if obj.adm0 else None

    @staticmethod
    def resolve_adm_1(obj):
        return obj.adm1.name if obj.adm1 else None

    @staticmethod
    def resolve_adm_2(obj):
        return obj.adm2.name if obj.adm2 else None

    @staticmethod
    def resolve_adm_3(obj):
        return obj.adm3.name if obj.adm3 else None

    @staticmethod
    def resolve_sprint(obj):
        if obj.model.sprint:
            return obj.model.sprint.year
        return None

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
