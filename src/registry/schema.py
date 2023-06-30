from datetime import date
from typing import Optional

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
    author: Optional[str] = Field(q="author__user__name__icontains")
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
