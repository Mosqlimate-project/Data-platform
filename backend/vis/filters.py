from datetime import date

from ninja import FilterSchema
from pydantic import Field, field_validator
from typing import Optional, Literal, Union
from typing_extensions import Annotated

from main.utils import CODES_UF


class DashboardParams(FilterSchema):
    sprint: bool
    disease: Literal["dengue", "zika", "chikungunya"] = "dengue"
    adm_level: Annotated[Optional[int], Field(ge=1, le=2)] = None
    # fmt: off
    adm_1: Optional[Union[int, Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]]] = None
    # fmt: on
    adm_2: Optional[int] = None
    tags: Optional[list[int]] = []

    @field_validator("adm_1", mode="before")
    def parse_adm1_to_uf(cls, v):
        if str(v).isdigit():
            return CODES_UF[int(v)]
        return v


class DashboardLineChart(DashboardParams):
    start: Optional[date] = None
    end: Optional[date] = None
    preds: list[int] = []


class DashboardPredictions(DashboardParams):
    models: Optional[list[int]] = []
