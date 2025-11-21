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


class MunicipalityInfoSchema(Schema):
    municipio: str
    codigo_uf: int
    uf: str
    uf_nome: str
    fuso_horario: str
    latitude: float
    longitude: float


class StateInfoSchema(Schema):
    name: str
    uf: str
