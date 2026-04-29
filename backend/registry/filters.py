from datetime import date
from typing import Optional, Literal

from ninja import FilterSchema, Field


class ModelFilterSchema(FilterSchema):
    id: Optional[int] = Field(None, q="id__exact")
    repository_owner: Optional[str] = Field(
        None, q="repository__owner__username__iexact"
    )
    repository_organization: Optional[str] = Field(
        None, q="repository__organization__name__iexact"
    )
    repository_name: Optional[str] = Field(None, q="repository__name__iexact")
    disease: Optional[str] = Field(None, q="predicts__disease__code__iexact")
    adm_level: Optional[Literal[0, 1, 2, 3]] = Field(
        None, q="predicts__adm_level"
    )
    time_resolution: Optional[Literal["day", "week", "month", "year"]] = Field(
        None, q="time_resolution__iexact"
    )
    category: Optional[
        Literal[
            "quantitative",
            "categorical",
            "spatial_quantitative",
            "spatial_categorical",
            "spatio_temporal_quantitative",
            "spatio_temporal_categorical",
        ]
    ] = Field(None, q="category__icontains")
    imdc_year: Optional[int] = Field(None, q="sprint__year__exact")


class PredictionFilterSchema(FilterSchema):
    id: Optional[int] = Field(None, q="id__exact")
    model_id: Optional[int] = Field(None, q="model__id__exact")
    model_owner: Optional[str] = Field(
        None, q="model__repository__owner__username__icontains"
    )
    model_organization: Optional[str] = Field(
        None, q="model__repository__organization__name__icontains"
    )
    model_name: Optional[str] = Field(
        None, q="model__repository__name__icontains"
    )
    adm_level: Optional[int] = Field(None, q="adm_level")
    model_time_resolution: Optional[
        Literal["day", "week", "month", "year"]
    ] = Field(None, q="model__time_resolution__iexact")
    disease: Optional[str] = Field(None, q="disease__code__iexact")
    model_category: Optional[
        Literal[
            "quantitative",
            "categorical",
            "spatial_quantitative",
            "spatial_categorical",
            "spatio_temporal_quantitative",
            "spatio_temporal_categorical",
        ]
    ] = Field(None, q="model__category__icontains")
    imdc_year: Optional[int] = Field(None, q="model__sprint__year__exact")
    start: Optional[date] = Field(
        None, q="quantitativeprediction__data__date__gte"
    )
    end: Optional[date] = Field(
        None, q="quantitativeprediction__data__date__lte"
    )
