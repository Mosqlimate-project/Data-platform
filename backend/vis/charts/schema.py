from datetime import date
from typing import Optional

from ninja import Schema
from pydantic import field_validator, model_validator


MAX_DATE_RANGE_DAYS = 365

VALID_DISEASES = {"dengue", "deng", "chik", "chikungunya", "zika"}

VALID_UFS = {
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
    "DF",
}


# --- Input schemas ---


class InfodengueChartIn(Schema):
    disease: str
    geocode: int
    start: date
    end: date

    @field_validator("disease")
    @classmethod
    def validate_disease(cls, v):
        if v.lower() not in VALID_DISEASES:
            raise ValueError(
                f"Invalid disease '{v}'. "
                f"Must be one of: {', '.join(sorted(VALID_DISEASES))}"
            )
        return v.lower()

    @field_validator("geocode")
    @classmethod
    def validate_geocode(cls, v):
        if len(str(v)) != 7:
            raise ValueError("Geocode must be a 7-digit municipality code")
        return v

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end < self.start:
            raise ValueError("End date must be after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"Date range exceeds maximum of {MAX_DATE_RANGE_DAYS} days"
            )
        return self


class ClimateChartIn(Schema):
    geocode: int
    start: date
    end: date

    @field_validator("geocode")
    @classmethod
    def validate_geocode(cls, v):
        if len(str(v)) != 7:
            raise ValueError("Geocode must be a 7-digit municipality code")
        return v

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end < self.start:
            raise ValueError("End date must be after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"Date range exceeds maximum of {MAX_DATE_RANGE_DAYS} days"
            )
        return self


class ContaOvosChartIn(Schema):
    start: date
    end: date
    uf: Optional[str] = None
    geocode: Optional[int] = None

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v):
        if v is not None and v.upper() not in VALID_UFS:
            raise ValueError(
                f"Invalid UF '{v}'. Must be a valid Brazilian state code"
            )
        return v.upper() if v else v

    @field_validator("geocode")
    @classmethod
    def validate_geocode(cls, v):
        if v is not None and len(str(v)) != 7:
            raise ValueError("Geocode must be a 7-digit municipality code")
        return v

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end < self.start:
            raise ValueError("End date must be after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"Date range exceeds maximum of {MAX_DATE_RANGE_DAYS} days"
            )
        return self


class ContaOvosPositivityIn(Schema):
    start: date
    end: date
    uf: Optional[str] = None

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v):
        if v is not None and v.upper() not in VALID_UFS:
            raise ValueError(
                f"Invalid UF '{v}'. Must be a valid Brazilian state code"
            )
        return v.upper() if v else v

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end < self.start:
            raise ValueError("End date must be after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"Date range exceeds maximum of {MAX_DATE_RANGE_DAYS} days"
            )
        return self


class ContaOvosMapIn(Schema):
    start: date
    end: date

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end < self.start:
            raise ValueError("End date must be after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"Date range exceeds maximum of {MAX_DATE_RANGE_DAYS} days"
            )
        return self


# --- Output schemas ---


class InfodengueRtOut(Schema):
    data_iniSE: date
    Rt: Optional[float] = None


class InfodengueTotalCasesOut(Schema):
    total_cases: int


class ClimateTemperatureOut(Schema):
    date: date
    epiweek: int
    temp_min: float
    temp_med: float
    temp_max: float


class ClimateAccumulatedWaterfallOut(Schema):
    date: date
    epiweek: int
    precip_tot: float
    precip_med: float


class ClimateHumidityPressureOut(Schema):
    date: date
    epiweek: int
    umid_med: float
    pressao_med: float


class ContaOvosEggsDensityOut(Schema):
    epiweek: str
    total_eggs: int


class ContaOvosPositivityOut(Schema):
    name: str
    positivity: float


class ContaOvosMapStateOut(Schema):
    name: str
    total_eggs: int
    trap_count: int
    municipality_count: int


class ContaOvosMapScatterOut(Schema):
    name: str
    latitude: float
    longitude: float
    trap_id: int
    municipality: str
