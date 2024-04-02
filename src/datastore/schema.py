from typing import Optional

from datetime import date
from ninja import Field, Schema, FilterSchema


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


class ContaOvosSchema(Schema):
    """https://contaovos.dengue.mat.br"""

    complement: str
    district: str
    eggs: int
    latitude: float
    loc_inst: str
    longitude: float
    municipality: str
    number: str
    ovitrap_id: str
    ovitrap_website_id: int
    sector: Optional[str]
    street: str
    time: str
    user: str
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


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field(q="data_iniSE__gte")
    end: date = Field(q="data_iniSE__lte")
    geocode: Optional[int] = Field(q="municipio_geocodigo")


class CopernicusBrasilFilterSchema(FilterSchema):
    """url/?paremeters to search for weather.copernicus_brasil table"""

    start: date = Field(q="date__gte")
    end: date = Field(q="date__lte")
    geocode: Optional[int] = Field(q="geocodigo")
