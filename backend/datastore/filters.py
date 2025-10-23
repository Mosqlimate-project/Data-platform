from typing import Optional
from datetime import date

from ninja import Field, FilterSchema
from pydantic import field_validator


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field("2024-01-01", q="data_iniSE__gte")
    end: date = Field("2024-02-01", q="data_iniSE__lte")
    geocode: Optional[int] = Field(None, q="municipio_geocodigo")


class CopernicusBrasilFilterSchema(FilterSchema):
    """url/?paremeters to search for weather.copernicus_bra table"""

    start: date = Field("2024-01-01", q="date__gte")
    end: date = Field("2024-02-01", q="date__lte")
    geocode: Optional[int] = Field(None, q="geocodigo")


class CopernicusBrasilWeeklyFilterSchema(FilterSchema):
    """url/?paremeters to search for copernicus_brasil_weekly endpoint"""

    start: int = Field(202401, q="epiweek__gte")
    end: int = Field(202402, q="epiweek__lte")

    @field_validator("start", "end")
    @classmethod
    def check_epiweek_length(cls, value: int) -> int:
        if len(str(value)) != 6:
            raise ValueError("Epiweek must be a 6-digit integer")
        return value
