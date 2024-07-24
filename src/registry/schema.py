from datetime import date
from typing import Optional, Literal, List
from pydantic import validator

from ninja import Field, FilterSchema
from ninja.orm.fields import AnyObject

from main.schema import Schema
from users.schema import UserSchema


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


class PredictionDataRowSchema(Schema):
    dates: date
    preds: float
    lower: float
    upper: float
    adm_0: str = "BRA"
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None
    adm_3: Optional[int] = None


class PredictionSchema(Schema):
    id: Optional[int]
    model: ModelSchema
    description: str | None = None
    commit: str
    predict_date: date  # YYYY-mm-dd
    prediction: AnyObject


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
    predict_date: Optional[date] = Field(None, q="predict_date")
    start: Optional[date] = Field(None, q="predict_date__gte")
    end: Optional[date] = Field(None, q="predict_date__lte")
