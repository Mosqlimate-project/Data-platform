from datetime import date
from typing import Optional, Tuple

from ninja import Field, FilterSchema
from ninja.orm.fields import AnyObject

from main.schema import Schema
from users.schema import UserSchema


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
    implementation_language: str
    type: str


class ModelFilterSchema(FilterSchema):
    """url/?paremeters to search for Models"""

    id: Optional[int] = Field(q="id")
    name: Optional[str] = Field(q="name__icontains")
    author_name: Optional[str] = Field(q="author__user__name__icontains")
    author_username: Optional[str] = Field(q="author__user__username__icontains")
    author_institution: Optional[str] = Field(q="author__institution__icontains")
    repository: Optional[str] = Field(q="repository__icontains")
    implementation_language: Optional[str] = Field(
        q="implementation_language__icontains"
    )
    type: Optional[str] = Field(q="type__icontains")


class PredictionSchema(Schema):
    id: Optional[int]
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: date  # YYYY-mm-dd
    prediction: AnyObject


class PredictionFilterSchema(FilterSchema):
    """url/?paremeters to search for Predictions"""

    id: Optional[int] = Field(q="id")
    model_id: Optional[int] = Field(q="model__id")
    model_name: Optional[str] = Field(q="model__name__icontains")
    author_name: Optional[str] = Field(q="model__author__user__name__icontains")
    author_username: Optional[str] = Field(q="model__author__user__username__icontains")
    author_institution: Optional[str] = Field(q="model__author__institution__icontains")
    repository: Optional[str] = Field(q="model__repository__icontains")
    implementation_language: Optional[str] = Field(
        q="model__implementation_language__icontains"
    )
    type: Optional[str] = Field(q="model__type__icontains")
    commit: Optional[str] = Field(q="commit")
    predict_date: Optional[date] = Field(q="predict_date")
    predict_after_than: Optional[date] = Field(q="predict_date__gte")
    predict_before_than: Optional[date] = Field(q="predict_date__lte")
    predict_between: Optional[Tuple[date, date]] = Field(q="predict_date__range")
