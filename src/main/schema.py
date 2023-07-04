from ninja import Schema


class SuccessSchema(Schema):
    message: str


class ForbiddenSchema(Schema):
    message: str


class NotFoundSchema(Schema):
    message: str
