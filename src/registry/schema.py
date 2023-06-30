from datetime import date

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
