from datetime import date
from typing import Optional, Literal

from ninja import FilterSchema, Field


class ModelFilterSchema(FilterSchema):
    id: Optional[int] = Field(default=None, q="id__exact")  # type: ignore[call-overload]
    repository_owner: Optional[str] = Field(
        None, q="repository__owner__username__iexact"
    )  # type: ignore[call-overload]
    repository_organization: Optional[str] = Field(
        None, q="repository__organization__name__iexact"
    )  # type: ignore[call-overload]
    repository_name: Optional[str] = Field(
        default=None, q="repository__name__iexact"
    )  # type: ignore[call-overload]
    disease: Optional[str] = Field(
        default=None, q="predicts__disease__code__iexact"
    )  # type: ignore[call-overload]
    adm_level: Optional[Literal[0, 1, 2, 3]] = Field(
        None, q="predicts__adm_level"
    )  # type: ignore[call-overload]
    time_resolution: Optional[Literal["day", "week", "month", "year"]] = Field(
        None, q="time_resolution__iexact"
    )  # type: ignore[call-overload]
    category: Optional[
        Literal[
            "quantitative",
            "categorical",
            "spatial_quantitative",
            "spatial_categorical",
            "spatio_temporal_quantitative",
            "spatio_temporal_categorical",
        ]
    ] = Field(
        default=None, q="category__icontains"
    )  # type: ignore[call-overload]
    imdc_year: Optional[int] = Field(default=None, q="sprint__year__exact")  # type: ignore[call-overload]


class PredictionFilterSchema(FilterSchema):
    id: Optional[int] = Field(default=None, q="id__exact")  # type: ignore[call-overload]
    model_id: Optional[int] = Field(default=None, q="model__id__exact")  # type: ignore[call-overload]
    model_owner: Optional[str] = Field(
        None, q="model__repository__owner__username__icontains"
    )  # type: ignore[call-overload]
    model_organization: Optional[str] = Field(
        None, q="model__repository__organization__name__icontains"
    )  # type: ignore[call-overload]
    model_name: Optional[str] = Field(
        None, q="model__repository__name__icontains"
    )  # type: ignore[call-overload]
    adm_level: Optional[int] = Field(default=None, q="adm_level")  # type: ignore[call-overload]
    model_time_resolution: Optional[
        Literal["day", "week", "month", "year"]
    ] = Field(
        default=None, q="model__time_resolution__iexact"
    )  # type: ignore[call-overload]
    disease: Optional[str] = Field(default=None, q="disease__code__iexact")  # type: ignore[call-overload]
    model_category: Optional[
        Literal[
            "quantitative",
            "categorical",
            "spatial_quantitative",
            "spatial_categorical",
            "spatio_temporal_quantitative",
            "spatio_temporal_categorical",
        ]
    ] = Field(
        default=None, q="model__category__icontains"
    )  # type: ignore[call-overload]
    imdc_year: Optional[int] = Field(
        default=None, q="model__sprint__year__exact"
    )  # type: ignore[call-overload]
    start: Optional[date] = Field(
        None, q="quantitativeprediction__data__date__gte"
    )  # type: ignore[call-overload]
    end: Optional[date] = Field(
        None, q="quantitativeprediction__data__date__lte"
    )  # type: ignore[call-overload]
