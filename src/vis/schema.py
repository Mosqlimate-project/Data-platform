from typing import Optional
from datetime import date

from ninja import FilterSchema, Field
from main.schema import Schema


class ResultsProbForecastSchema(Schema):
    date: date
    geocode: int
    lower_2_5: float
    lower_25: float
    forecast: float
    upper_75: float
    upper_97_5: float
    prob_high: float
    prob_low: float
    HT: float
    LT: float
    HTinc: float
    LTinc: float


class ResultsProbForecastFilterSchema(FilterSchema):
    date: Optional[str] = Field(q="date__str")
    geocode: Optional[int] = Field(q="geocode")
