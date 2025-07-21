from typing import Optional

from datetime import date
from pydantic import BaseModel, validator, field_validator
from ninja import Field, Schema, FilterSchema


class DengueGlobalSchema(Schema):
    geocodigo: int
    nome: str
    uf: str


class HistoricoAlertaPartialSchema(Schema):
    data_iniSE: date
    SE: Optional[int]
    casos_est: Optional[float]
    casos_est_min: Optional[int]
    casos_est_max: Optional[int]
    casos: Optional[int]
    municipio_geocodigo: Optional[int]
    p_rt1: Optional[float]
    p_inc100k: Optional[float]
    nivel: Optional[int]
    id: Optional[int]
    versao_modelo: Optional[str]
    Rt: Optional[float]
    municipio_nome: Optional[str]
    pop: Optional[float]
    receptivo: Optional[int]
    transmissao: Optional[int]
    nivel_inc: Optional[int]
    casprov: Optional[int]


class HistoricoAlertaSchema(Schema):
    data_iniSE: date
    SE: Optional[int]
    casos_est: Optional[float]
    casos_est_min: Optional[int]
    casos_est_max: Optional[int]
    casos: Optional[int]
    municipio_geocodigo: Optional[int]
    p_rt1: Optional[float]
    p_inc100k: Optional[float]
    Localidade_id: Optional[int]
    nivel: Optional[int]
    id: Optional[int]
    versao_modelo: Optional[str]
    Rt: Optional[float]
    municipio_nome: Optional[str]
    pop: Optional[float]
    tempmin: Optional[float]
    umidmax: Optional[float]
    receptivo: Optional[int]
    transmissao: Optional[int]
    nivel_inc: Optional[int]
    umidmed: Optional[float]
    umidmin: Optional[float]
    tempmed: Optional[float]
    tempmax: Optional[float]
    casprov: Optional[int]
    casprov_est: Optional[float]
    casprov_est_min: Optional[int]
    casprov_est_max: Optional[int]
    casconf: Optional[int]


class CopernicusBrasilSchema(Schema):
    date: date
    geocodigo: int
    epiweek: int
    temp_min: float
    temp_med: float
    temp_max: float
    precip_min: float
    precip_med: float
    precip_max: float
    precip_tot: float
    pressao_min: float
    pressao_med: float
    pressao_max: float
    umid_min: float
    umid_med: float
    umid_max: float


class CopernicusBrasilWeeklyParams(BaseModel):
    geocode: Optional[int] = None
    macro_health_code: Optional[int] = None
    # fmt: off
    uf: Optional[str] = None
    # fmt: on

    @validator("geocode")
    def validate_geocode(cls, value):
        if len(str(value)) != 7:
            raise ValueError("Municipality geocode must contain 7 digits")
        return value

    @validator("macro_health_code")
    def validate_macro_health_code(cls, value):
        if len(str(value)) != 4:
            raise ValueError("Macro Health code must contain 4 digits")
        return value

    @validator("uf")
    def validate_uf(cls, value):
        if value.upper() not in [
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
        ]:
            raise ValueError('Unkown UF. Example: "SP"')
        return value


class CopernicusBrasilWeeklySchema(Schema):
    epiweek: int  # YYYYWW
    geocodigo: int  # City or GeoMacroSaude
    temp_min_avg: float
    temp_med_avg: float
    temp_max_avg: float
    temp_amplit_avg: float  # (temp_max - temp_min)
    precip_tot_sum: float
    umid_min_avg: float
    umid_med_avg: float
    umid_max_avg: float


class ContaOvosSchema(Schema):
    """https://contaovos.com/pt-br/api/lastcountingpublic"""

    counting_id: int
    date: str
    date_collect: Optional[str]
    eggs: int
    latitude: float
    longitude: float
    municipality: str
    municipality_code: str
    ovitrap_id: str
    ovitrap_website_id: int
    state_code: str
    state_name: str
    time: str
    week: int
    year: int


class EpiScannerSchema(Schema):
    disease: str
    CID10: str
    year: int
    geocode: int
    muni_name: str
    peak_week: float
    beta: float
    gamma: float
    R0: float
    total_cases: float
    alpha: float
    sum_res: float
    ep_ini: str
    ep_end: str
    ep_dur: int


class Sprint202425Schema(Schema):
    date: date
    year: int
    epiweek: int
    casos: int
    geocode: int
    regional: str
    regional_geocode: int
    macroregional: str
    macroregional_geocode: int
    uf: str
    train_1: bool
    train_2: bool
    target_1: bool
    target_2: bool


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field("2024-01-01", q="data_iniSE__gte")
    end: date = Field("2024-02-01", q="data_iniSE__lte")
    geocode: Optional[int] = Field(None, q="municipio_geocodigo")


class CopernicusBrasilFilterSchema(FilterSchema):
    """url/?paremeters to search for weather.copernicus_bra table"""

    start: date = Field("2024-01-01", q="date__gte")
    end: date = Field("2024-02-01", q="date__lte")
    geocode: Optional[int] = Field(None, q="geocodigo")


class CopernicusBrasilWeeklyFilterSchema(FilterSchema):
    """url/?paremeters to search for copernicus_brasil_weekly endpoint"""

    start: int = Field(202401, q="epiweek__gte")
    end: int = Field(202402, q="epiweek__lte")

    @field_validator("start", "end")
    @classmethod
    def check_epiweek_length(cls, value: int) -> int:
        if len(str(value)) != 6:
            raise ValueError("Epiweek must be a 6-digit integer")
        return value


class ContaOvosParams(BaseModel):
    date_start: date = Field("2025-01-01")
    date_end: date = Field("2025-01-30")
    page: Optional[int] = Field(1)
    state: Optional[str] = Field("MG")
