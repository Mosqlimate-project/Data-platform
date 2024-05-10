from datetime import date
from typing import Optional, Literal

from ninja import Field, FilterSchema
from ninja.orm.fields import AnyObject

from main.schema import Schema
from users.schema import UserSchema


class ImplementationLanguageSchema(Schema):
    language: str


class AuthorSchema(Schema):
    user: UserSchema
    institution: str = None


class AuthorFilterSchema(FilterSchema):
    """url/?paremeters to search for Authors"""

    name: Optional[str] = Field(q="user__name__icontains")
    username: Optional[str] = Field(q="user__username__icontains")
    institution: Optional[str] = Field(q="institution__icontains")


class ModelSchema(Schema):
    id: Optional[int]
    name: str
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: ImplementationLanguageSchema
    disease: Literal["dengue", "chikungunya", "zika"] = None
    categorical: bool = None
    spatial: bool = None
    temporal: bool = None
    ADM_level: Literal[0, 1, 2, 3] = None
    time_resolution: Literal["day", "week", "month", "year"] = None


class ModelFilterSchema(FilterSchema):
    """url/?paremeters to search for Models"""

    id: Optional[int] = Field(q="id__exact")
    name: Optional[str] = Field(q="name__icontains")
    author_name: Optional[str] = Field(q="author__user__name__icontains")
    author_username: Optional[str] = Field(
        q="author__user__username__icontains"
    )
    author_institution: Optional[str] = Field(
        q="author__institution__icontains"
    )
    repository: Optional[str] = Field(q="repository__icontains")
    implementation_language: Optional[str] = Field(
        q="implementation_language__language__iexact"
    )
    disease: Optional[Literal["dengue", "zika", "chikungunya"]] = Field(
        q="disease__iexact"
    )
    ADM_level: Optional[Literal[0, 1, 2, 3]] = Field(q="ADM_level")
    temporal: Optional[bool] = Field(q="temporal")
    spatial: Optional[bool] = Field(q="spatial")
    categorical: Optional[bool] = Field(q="categorical")
    time_resolution: Optional[Literal["day", "week", "month", "year"]] = Field(
        q="time_resolution__iexact"
    )


class PredictionSchema(Schema):
    id: Optional[int]
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: date  # YYYY-mm-dd
    prediction: AnyObject


class PredictionFilterSchema(FilterSchema):
    """url/?paremeters to search for Predictions"""

    id: Optional[int] = Field(q="id__exact")
    model_id: Optional[int] = Field(q="model__id__exact")
    model_name: Optional[str] = Field(q="model__name__icontains")
    model_ADM_level: Optional[int] = Field(q="model__ADM_level")
    model_time_resolution: Optional[
        Literal["day", "week", "month", "year"]
    ] = Field(q="model__time_resolution__iexact")
    model_disease: Optional[Literal["dengue", "zika", "chikungunya"]] = Field(
        q="model__disease__iexact"
    )
    author_name: Optional[str] = Field(
        q="model__author__user__name__icontains"
    )
    author_username: Optional[str] = Field(
        q="model__author__user__username__icontains"
    )
    author_institution: Optional[str] = Field(
        q="model__author__institution__icontains"
    )
    repository: Optional[str] = Field(q="model__repository__icontains")
    implementation_language: Optional[str] = Field(
        q="model__implementation_language__language__iexact"
    )
    temporal: Optional[bool] = Field(q="model__temporal")
    spatial: Optional[bool] = Field(q="model__spatial")
    categorical: Optional[bool] = Field(q="model__categorical")
    commit: Optional[str] = Field(q="commit")
    predict_date: Optional[date] = Field(q="predict_date")
    start: Optional[date] = Field(q="predict_date__gte")
    end: Optional[date] = Field(q="predict_date__lte")
