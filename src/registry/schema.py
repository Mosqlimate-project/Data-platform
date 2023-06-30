from datetime import date
from typing import Optional

from django.db.models import Q

from ninja import FilterSchema, Field
from ninja import Schema
from ninja.orm.fields import AnyObject


class SuccessSchema(Schema):
    message: str


class ForbiddenSchema(Schema):
    message: str


class NotFoundSchema(Schema):
    message: str


class UserSchema(Schema):
    id: int
    username: str
    name: str


class AuthorSchema(Schema):
    id: int
    user: UserSchema
    institution: str = None


class AuthorFilterSchema(FilterSchema):
    name: Optional[str]
    username: Optional[str] = Field(q="user__username__icontains")
    institution: Optional[str] = Field(q="institution__icontains")

    def filter_name(self, name: str) -> Q:
        if self.name:
            for wrd in name.split():
                return Q(user__first_name__icontains=wrd) | Q(
                    user__last_name__icontains=wrd
                )


class ModelSchema(Schema):
    id: int
    name: str
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: str
    type: str


class PredictionSchema(Schema):
    id: int
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: date
    prediction: AnyObject
