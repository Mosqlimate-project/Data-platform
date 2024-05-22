from typing import Optional, Literal
from datetime import date

from ninja import FilterSchema, Field
from main.schema import Schema
from registry.schema import ModelSchema


class ResultsProbForecastIn(Schema):
    model_id: int
    disease: Literal["dengue", "chik", "zika"]
    date: date
    geocode_id: str
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


class ResultsProbForecastOut(Schema):
    id: int
    model: ModelSchema
    disease: Literal["dengue", "chik", "zika"]
    date: date
    geocode_id: str
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
    model: Optional[int] = Field(q="model__int")
    date: Optional[str] = Field(q="date__str")
    geocode: Optional[int] = Field(q="geocode")
