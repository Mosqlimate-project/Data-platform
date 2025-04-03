from typing import Optional, Literal
from datetime import date

from ninja import FilterSchema, Field
from main.schema import Schema


class TotalCasesSchema(Schema):
    uf: str
    total_cases: int


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
