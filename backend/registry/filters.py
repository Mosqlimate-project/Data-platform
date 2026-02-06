from datetime import date
from typing import Optional, Literal

from ninja import FilterSchema, Field


class PredictionFilterSchema(FilterSchema):
    id: Optional[int] = Field(q="id__exact")
    model_id: Optional[int] = Field(q="model__id__exact")
    model_name: Optional[str] = Field(q="model__name__icontains")
    model_ADM_level: Optional[int] = Field(q="model__ADM_level")
    model_time_resolution: Optional[
        Literal["day", "week", "month", "year"]
    ] = Field(q="model__time_resolution__iexact")
    model_disease: Optional[Literal["dengue", "zika", "chikungunya"]] = Field(
        q="model__disease__iexact"
    )
    author_name: Optional[str] = Field(
        q="model__author__user__name__icontains"
    )
    author_username: Optional[str] = Field(
        q="model__author__user__username__icontains"
    )
    author_institution: Optional[str] = Field(
        q="model__author__institution__icontains"
    )
    repository: Optional[str] = Field(q="model__repository__icontains")
    implementation_language: Optional[str] = Field(
        q="model__implementation_language__language__iexact"
    )
    temporal: Optional[bool] = Field(q="model__temporal")
    spatial: Optional[bool] = Field(q="model__spatial")
    categorical: Optional[bool] = Field(q="model__categorical")
    commit: Optional[str] = Field(q="commit")
    predict_date: Optional[date] = Field(q="predict_date")
    start: Optional[date] = Field(q="predict_date__gte")
    end: Optional[date] = Field(q="predict_date__lte")
