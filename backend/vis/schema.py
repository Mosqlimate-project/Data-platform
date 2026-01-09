from typing import Optional, Literal, Annotated, List
from datetime import date as dt

from ninja import FilterSchema, Field
from main.schema import Schema


class MinMaxDatesOut(Schema):
    min: dt
    max: dt


class DashboardPredictionData(Schema):
    date: dt
    upper_95: Optional[float]
    upper_90: Optional[float]
    upper_80: Optional[float]
    upper_50: Optional[float]
    pred: float
    lower_50: Optional[float]
    lower_80: Optional[float]
    lower_90: Optional[float]
    lower_95: Optional[float]


class DashboardLineChartPrediction(Schema):
    id: Optional[int] = None
    color: Optional[str] = None
    data: list[DashboardPredictionData]
    start: Optional[dt] = None
    end: Optional[dt] = None


class DashboardLineChartCases(Schema):
    labels: list[dt]
    cases: list[Optional[int]]


class PredictionScore(Schema):
    name: Literal[
        "mae_score",
        "mse_score",
        "crps_score",
        "log_score",
        "interval_score",
        "wis_score",
    ]
    score: Optional[float] = None


class DashboardPredictionOut(Schema):
    id: int
    owner: str
    repository: str
    start: Optional[dt] = None
    end: Optional[dt] = None
    sprint: Optional[int] = None
    scores: list[PredictionScore]

    @staticmethod
    def resolve_owner(obj):
        repo = obj.model.repository
        if hasattr(repo, "organization") and repo.organization:
            return repo.organization.name
        if hasattr(repo, "owner") and repo.owner:
            return repo.owner.username
        return "Unknown"

    @staticmethod
    def resolve_repository(obj):
        return obj.model.repository.name

    @staticmethod
    def resolve_sprint(obj):
        if obj.model.sprint:
            return obj.model.sprint.year
        return None

    @staticmethod
    def resolve_scores(obj):
        score_fields = [
            "mae_score",
            "mse_score",
            "crps_score",
            "log_score",
            "interval_score",
            "wis_score",
        ]
        return [
            {"name": field, "score": getattr(obj, field)}
            for field in score_fields
            if getattr(obj, field) is not None
        ]


class DashboardModelOut(Schema):
    id: int
    name: str
    author: str = Field(alias="author__user__name")


class DashboardTag(Schema):
    id: int
    name: str
    color: str


class DashboardTagsOut(Schema):
    models: list[DashboardTag]
    preds: list[DashboardTag]


class DashboardSprintOut(Schema):
    id: int
    year: int


class DashboardDiseasesOut(Schema):
    code: str
    name: str


class DashboardADMOut(Schema):
    geocode: str
    name: str


class HistoricoAlertaCases(Schema):
    date: dt
    cases: int


class HistoricoAlertaCasesIn(Schema):
    sprint: Annotated[bool, Field(False)]
    disease: str = "A90"
    start: dt
    end: dt
    adm_level: Annotated[int, Field(ge=0, le=3)]
    adm_1: Optional[str] = None
    adm_2: Optional[int] = None


class TotalCasesSchema(Schema):
    uf: str
    total_cases: int | float


class ResultsProbForecastSchema(Schema):
    disease: Literal["dengue", "chik", "chikungunya", "zika"]
    date: dt
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
    dt: Optional[str] = Field("2024-01-01", q="date__str")
    geocode: Optional[int] = Field(q="geocode")


class LevelOut(Schema):
    id: str
    label: str
    url_slug: str


class CategoryOut(Schema):
    id: str
    label: str
    levels: List[LevelOut]
