from typing import Optional, List

from datetime import date
from pydantic import BaseModel, field_validator
from ninja import Field, Schema


class VegetationIndexMetricSchema(Schema):
    date: date
    geocode: int
    collection: str
    attribute: str
    mean: Optional[float] = None
    std: Optional[float] = None
    median: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class EndpointDataVar(Schema):
    variable: str
    type: str
    description: str


class EndpointChartOption(Schema):
    option: str
    type: str


class EndpointDetails(Schema):
    endpoint: str
    name: str
    description: str
    tags: list[str]
    more_info_link: str
    data_variables: list[EndpointDataVar]
    chart_options: list[EndpointChartOption]


class DengueGlobalSchema(Schema):
    geocodigo: int
    nome: str
    uf: str


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

    @field_validator("geocode")
    def validate_geocode(cls, value):
        if len(str(value)) != 7:
            raise ValueError("Municipality geocode must contain 7 digits")
        return value

    @field_validator("macro_health_code")
    def validate_macro_health_code(cls, value):
        if len(str(value)) != 4:
            raise ValueError("Macro Health code must contain 4 digits")
        return value

    @field_validator("uf")
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


class ContaOvosParams(BaseModel):
    date_start: date = Field(default_factory=lambda: date(2025, 1, 1))
    date_end: date = Field(default_factory=lambda: date(2025, 1, 30))
    page: Optional[int] = Field(1)
    state: Optional[str] = Field("MG")


class MunTempOut(Schema):
    date: date
    epiweek: int
    temp_min: float
    temp_med: float
    temp_max: float


class EggsDensitySchema(Schema):
    epiweek: str
    total_eggs: int


class PositivitySchema(Schema):
    name: str
    positivity: float


class MapStateSchema(Schema):
    name: str
    total_eggs: int
    trap_count: int
    municipality_count: int


class MapScatterSchema(Schema):
    name: str
    latitude: float
    longitude: float
    trap_id: int
    municipality: str


class MunAccWaterfallOut(Schema):
    date: date
    epiweek: int
    precip_tot: float
    precip_med: float


class MunUmidPressMedOut(Schema):
    date: date
    epiweek: int
    umid_med: float
    pressao_med: float


class DiseaseOut(Schema):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class CityOut(Schema):
    geocode: int
    name: str
    adm1: str = Field(..., alias="adm1.name")
    country: str = Field(..., alias="adm1.country.name")


class EpiScannerStateSchema(Schema):
    code: str
    name: str


class EpiScannerCitySchema(Schema):
    geocode: str
    name: str


class EpiScannerParameterSchema(Schema):
    cid10: str
    geocode: int
    year: int
    ep_ini: Optional[str] = None
    ep_pw: str
    ep_end: Optional[str] = None
    ep_dur: Optional[int] = None
    peak_week: float
    beta: float
    gamma: float
    r0: float
    total_cases: float
    alpha: float
    sum_res: float


class EpiScannerTimeseriesRow(Schema):
    date: date
    casos: Optional[int] = None
    casos_est: Optional[float] = None
    casos_cum: Optional[int] = None


class EpiScannerTopCitySchema(Schema):
    name_muni: str
    transmissao: int
    code_muni: str


class EpiScannerMapsWeeksItem(Schema):
    code_muni: str
    transmissao: Optional[int] = None


class EpiScannerR0MapItem(Schema):
    code_muni: str
    R0: float


class EpiScannerR0MapResponse(Schema):
    r0Data: List[EpiScannerR0MapItem]
    topR0: List[EpiScannerR0MapItem]


class EpiScannerModelEvalItem(Schema):
    code_muni: str
    observed_cases: int
    total_cases: float
    rate: Optional[float] = None


class EpiScannerModelEvalBin(Schema):
    range: str
    count: int
    percentage: float


class EpiScannerModelEvalResponse(Schema):
    rateMap: List[EpiScannerModelEvalItem]
    table: List[EpiScannerModelEvalBin]
