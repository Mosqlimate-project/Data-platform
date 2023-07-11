from ninja import Schema


class SuccessSchema(Schema):
    """200"""

    message: str


class ForbiddenSchema(Schema):
    """403"""

    message: str


class NotFoundSchema(Schema):
    """404"""

    message: str
