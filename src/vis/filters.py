from datetime import date

from ninja import FilterSchema
from pydantic import Field
from typing import Optional, Literal
from typing_extensions import Annotated


class DashboardParams(FilterSchema):
    sprint: bool
    disease: Literal["dengue", "zika", "chikungunya"] = "dengue"
    adm_level: Annotated[int, Field(ge=1, le=2)]
    # fmt: off
    adm_1: Optional[Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]] = None
    # fmt: on
    adm_2: Optional[int] = None
    tags: Optional[list[int]] = []


class DashboardLineChart(DashboardParams):
    start: date
    end: date
    preds: list[int] = []


class DashboardPredictions(DashboardParams):
    models: Optional[list[int]] = []
