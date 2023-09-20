from typing import Optional
from datetime import date
from ninja import Field, Schema, FilterSchema


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


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field(q="data_iniSE__gte")
    end: date = Field(q="data_iniSE__lte")
