from typing import Optional

from ninja import Schema


class SuccessSchema(Schema):
    """200"""

    message: Optional[str]


class BadRequestSchema(Schema):
    """400"""

    message: str


class ForbiddenSchema(Schema):
    """403"""

    message: str


class NotFoundSchema(Schema):
    """404"""

    message: str


class UnprocessableContentSchema(Schema):
    """422"""

    message: str


class InternalErrorSchema(Schema):
    """500"""

    message: str
