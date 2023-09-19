from datetime import date
from ninja import Field, Schema, FilterSchema


class HistoricoAlertaSchema(Schema):
    data_iniSE: date
    SE: int
    casos_est: float
    casos_est_min: int
    casos_est_max: int
    casos: int
    municipio_geocodigo: int
    p_rt1: float
    p_inc100k: float
    Localidade_id: int
    nivel: int
    id: int
    versao_modelo: str
    municipio_nome: str
    pop: float
    tempmin: float
    umidmax: float
    receptivo: int
    transmissao: int
    nivel_inc: int
    umidmed: float
    umidmin: float
    tempmed: float
    tempmax: float
    casprov: int
    casprov_est: float
    casprov_est_min: int
    casprov_est_max: int
    casconf: int


class HistoricoAlertaFilterSchema(FilterSchema):
    """url/?paremeters to search for "Municipios"."Historico_alerta" table"""

    start: date = Field(q="data_iniSE__gte")
    end: date = Field(q="data_iniSE__lte")
