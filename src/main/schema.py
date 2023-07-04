from ninja import Schema


class SuccessSchema(Schema):
    message: str


class ForbiddenSchema(Schema):
    message: str


class NotFoundSchema(Schema):
    message: str


class UserSchema(Schema):
    name: str
    username: str
