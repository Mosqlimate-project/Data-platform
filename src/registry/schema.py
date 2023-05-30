from ninja import Schema
from datetime import datetime, date
from ninja.orm.fields import AnyObject


class NotFoundSchema(Schema):
    message: str


class AuthorSchema(Schema):
    id: int
    name: str
    email: str
    institution: str
    created: datetime
    updated: datetime


class ModelSchema(Schema):
    id: int
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: str
    type: str
    created: datetime
    updated: datetime


class PredictionSchema(Schema):
    id: int
    description: str = None
    commit: str
    predict_date: date
    prediction: AnyObject
    created: datetime
    updated: datetime
