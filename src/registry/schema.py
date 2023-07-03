from datetime import date
from typing import Optional, Tuple

from ninja import Field, FilterSchema
from ninja.orm.fields import AnyObject

from main.schema import Schema, UserSchema


class AuthorSchema(Schema):
    user: UserSchema
    institution: str = None


class AuthorFilterSchema(FilterSchema):
    name: Optional[str] = Field(q="user__name__icontains")
    username: Optional[str] = Field(q="user__username__icontains")
    institution: Optional[str] = Field(q="institution__icontains")


class ModelSchema(Schema):
    name: str
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: str
    type: str


class ModelFilterSchema(FilterSchema):
    name: Optional[str] = Field(q="name__icontains")
    author_name: Optional[str] = Field(q="author__user__name__icontains")
    author_username: Optional[str] = Field(q="author__user__username__icontains")
    author_institution: Optional[str] = Field(q="author__institution__icontains")
    # repository?
    implementation_language: Optional[str] = Field(
        q="implementation_language__icontains"
    )
    type: Optional[str] = Field(q="type__icontains")


class PredictionSchema(Schema):
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: date
    prediction: AnyObject


class PredictionFilterSchema(FilterSchema):
    model: Optional[str]
    repository: Optional[str]
    commit: Optional[str]
    predict_date: Optional[date]
    predict_after_than: Optional[date]
    predict_before_than: Optional[date]
    predict_between: Optional[Tuple[date, date]]
