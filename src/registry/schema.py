import requests
from datetime import date as dt
from typing import Optional, Literal, List
from pydantic import validator, model_validator, field_validator

import pandas as pd
from ninja import Field, FilterSchema
from ninja.errors import HttpError

from main.schema import Schema
from users.schema import UserSchema
from vis.brasil.models import State, City
from .models import Model


class ImplementationLanguageSchema(Schema):
    language: str


class AuthorSchema(Schema):
    user: UserSchema
    institution: Optional[str] = None


class AuthorFilterSchema(FilterSchema):
    """url/?paremeters to search for Authors"""

    name: Optional[str] = Field(None, q="user__name__icontains")
    institution: Optional[str] = Field(None, q="institution__icontains")
    username: Optional[str] = Field(None, q="user__username__icontains")


class TagSchema(Schema):
    id: Optional[int]
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
    id: Optional[int]
    name: str
    description: str | None = None
    author: AuthorSchema
    repository: str
    implementation_language: ImplementationLanguageSchema
    disease: Literal["dengue", "chikungunya", "zika"] | None = None
    categorical: bool | None = None
    spatial: bool | None = None
    temporal: bool | None = None
    ADM_level: Literal[0, 1, 2, 3] | None = None
    time_resolution: Literal["day", "week", "month", "year"] | None = None
    sprint: bool


class ModelFilterSchema(FilterSchema):
    """url/?paremeters to search for Models"""

    id: Optional[int] = Field(None, q="id__exact")
    name: Optional[str] = Field(None, q="name__icontains")
    author_name: Optional[str] = Field(None, q="author__user__name__icontains")
    author_username: Optional[str] = Field(
        None, q="author__user__username__icontains"
    )
    author_institution: Optional[str] = Field(
        None, q="author__institution__icontains"
    )
    repository: Optional[str] = Field(None, q="repository__icontains")
    implementation_language: Optional[str] = Field(
        None, q="implementation_language__language__iexact"
    )
    disease: Optional[Literal["dengue", "zika", "chikungunya"]] = Field(
        None, q="disease__iexact"
    )
    ADM_level: Optional[Literal[0, 1, 2, 3]] = Field(None, q="ADM_level")
    temporal: Optional[bool] = Field(None, q="temporal")
    spatial: Optional[bool] = Field(None, q="spatial")
    categorical: Optional[bool] = Field(None, q="categorical")
    time_resolution: Optional[Literal["day", "week", "month", "year"]] = Field(
        None, q="time_resolution__iexact"
    )
    tags: Optional[List[int]] = Field(None, q="tags__id__in")
    sprint: Optional[bool] = Field(None, q="sprint")


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


class PredictionDataRowOut(Schema):
    date: dt
    pred: float
    lower_95: Optional[float] = None
    lower_90: float
    lower_80: Optional[float] = None
    lower_50: Optional[float] = None
    upper_50: Optional[float] = None
    upper_80: Optional[float] = None
    upper_90: float
    upper_95: Optional[float] = None


class PredictionSchema(Schema):
    id: int
    model: ModelSchema
    description: str = ""
    commit: str
    predict_date: dt  # YYYY-mm-dd
    adm_0: str = "BRA"
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None
    adm_3: Optional[int] = None
    data: List[PredictionDataRowSchema]


class PredictionOut(Schema):
    id: Optional[int] = None
    model: ModelSchema | int
    description: str
    commit: str
    predict_date: dt  # YYYY-mm-dd
    adm_0: str = "BRA"
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None
    adm_3: Optional[int] = None
    data: List[PredictionDataRowOut]


class PredictionIn(Schema):
    model: int
    description: str = ""
    commit: str
    predict_date: dt  # YYYY-mm-dd
    adm_0: str = "BRA"
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None
    adm_3: Optional[int] = None
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
        if len(v) < 50:
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
            print(pd.DataFrame(data=data))
        except Exception as e:
            raise HttpError(422, f"Unprocessable prediction data. Error: {e}")
        return v

    @model_validator(mode="before")
    def validate_adm_levels(cls, values):
        adm_1 = values.adm_1
        adm_2 = values.adm_2
        adm_3 = values.adm_3

        if sum(list(map(bool, [adm_1, adm_2, adm_3]))) != 1:
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
            try:
                City.objects.get(geocode=adm_2)
            except City.DoesNotExist:
                raise ValueError(f"unkown geocode '{adm_2}'. Format: 3304557")

        if adm_3:
            raise NotImplementedError(
                "ADM 3 (Submunicipality) is not yet implemented. "
                "Please contact the moderation"
            )

        return values


class PredictionFilterSchema(FilterSchema):
    """url/?paremeters to search for Predictions"""

    id: Optional[int] = Field(None, q="id__exact")
    model_id: Optional[int] = Field(None, q="model__id__exact")
    model_name: Optional[str] = Field(None, q="model__name__icontains")
    model_ADM_level: Optional[int] = Field(None, q="model__ADM_level")
    model_time_resolution: Optional[
        Literal["day", "week", "month", "year"]
    ] = Field(None, q="model__time_resolution__iexact")
    model_disease: Optional[Literal["dengue", "zika", "chikungunya"]] = Field(
        None, q="model__disease__iexact"
    )
    author_name: Optional[str] = Field(
        None, q="model__author__user__name__icontains"
    )
    author_username: Optional[str] = Field(
        None, q="model__author__user__username__icontains"
    )
    author_institution: Optional[str] = Field(
        None, q="model__author__institution__icontains"
    )
    repository: Optional[str] = Field(None, q="model__repository__icontains")
    implementation_language: Optional[str] = Field(
        None, q="model__implementation_language__language__iexact"
    )
    temporal: Optional[bool] = Field(None, q="model__temporal")
    spatial: Optional[bool] = Field(None, q="model__spatial")
    categorical: Optional[bool] = Field(None, q="model__categorical")
    commit: Optional[str] = Field(None, q="commit")
    predict_date: Optional[dt] = Field(None, q="predict_date")
    start: Optional[dt] = Field(None, q="predict_date__gte")
    end: Optional[dt] = Field(None, q="predict_date__lte")
    tags: Optional[List[int]] = Field(None, q="model__tags__id__in")
    sprint: Optional[bool] = Field(None, q="model__sprint")
