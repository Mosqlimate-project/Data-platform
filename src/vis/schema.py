from typing import Optional, Literal, Annotated
from datetime import date

from ninja import FilterSchema, Field
from main.schema import Schema


class HistoricoAlertaCases(Schema):
    date: date
    cases: int


class HistoricoAlertaCasesIn(Schema):
    sprint: Annotated[bool, Field(False)]
    disease: Annotated[
        Literal["dengue", "zika", "chikungunya"], Field("dengue")
    ]
    start: date
    end: date
    adm_level: Literal[1, 2]
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None


class TotalCasesSchema(Schema):
    uf: str
    total_cases: int | float


class ResultsProbForecastSchema(Schema):
    disease: Literal["dengue", "chik", "chikungunya", "zika"]
    date: date
    geocode: int
    lower_2_5: float
    lower_25: float
    forecast: float
    upper_75: float
    upper_97_5: float
    prob_high: float
    prob_low: float
    high_threshold: float
    low_threshold: float
    high_incidence_threshold: float
    low_incidence_threshold: float


class ResultsProbForecastFilterSchema(FilterSchema):
    date: Optional[str] = Field("2024-01-01", q="date__str")
    geocode: Optional[int] = Field(q="geocode")
