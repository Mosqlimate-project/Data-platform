from typing import Optional, List
from datetime import date

from ninja import Field, FilterSchema
from pydantic import field_validator
from django.db.models import Q


class VegetationIndexMetricFilterSchema(FilterSchema):
    start: date = Field(default="2024-01-01", q="date__gte")  # type: ignore[call-overload]
    end: date = Field(default="2024-02-01", q="date__lte")  # type: ignore[call-overload]
    geocode: Optional[int] = Field(default=None, q="geocode")  # type: ignore[call-overload]
    collection: Optional[str] = Field(default=None, q="collection")  # type: ignore[call-overload]
    attribute: Optional[str] = Field(default=None, q="attribute")  # type: ignore[call-overload]
    collections: Optional[List[str]] = Field(default=None, q="collection__in")  # type: ignore[call-overload]
    attributes: Optional[List[str]] = Field(default=None, q="attribute__in")  # type: ignore[call-overload]


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field(default="2024-01-01", q="data_iniSE__gte")  # type: ignore[call-overload]
    end: date = Field(default="2024-02-01", q="data_iniSE__lte")  # type: ignore[call-overload]
    geocode: Optional[int] = Field(default=None, q="municipio_geocodigo")  # type: ignore[call-overload]


class CopernicusBrasilFilterSchema(FilterSchema):
    """url/?paremeters to search for weather.copernicus_bra table"""

    start: date = Field(default="2024-01-01", q="date__gte")  # type: ignore[call-overload]
    end: date = Field(default="2024-02-01", q="date__lte")  # type: ignore[call-overload]
    geocode: Optional[int] = Field(default=None, q="geocodigo")  # type: ignore[call-overload]


class CopernicusBrasilWeeklyFilterSchema(FilterSchema):
    """url/?paremeters to search for copernicus_brasil_weekly endpoint"""

    start: int = Field(default=202401, q="epiweek__gte")  # type: ignore[call-overload]
    end: int = Field(default=202402, q="epiweek__lte")  # type: ignore[call-overload]

    @field_validator("start", "end")
    @classmethod
    def check_epiweek_length(cls, value: int) -> int:
        if len(str(value)) != 6:
            raise ValueError("Epiweek must be a 6-digit integer")
        return value


class DiseaseFilterSchema(FilterSchema):
    name: Optional[str] = Field(default=None)

    def filter_name(self, value: str) -> Q:
        if not value:
            return Q()
        return Q(name__icontains=value) | Q(code__icontains=value)


class Adm2FilterSchema(FilterSchema):
    name: Optional[str] = Field(default=None)
    geocode: Optional[int] = Field(default=None)
    adm1: Optional[str] = Field(default=None, alias="adm1__name")

    def filter_name(self, value: str) -> Q:
        return Q(name__icontains=value)
