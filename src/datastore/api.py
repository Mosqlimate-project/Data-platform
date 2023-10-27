import requests
from typing import List, Literal, Optional

from ninja import Router, Query
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError

from main.schema import NotFoundSchema, InternalErrorSchema
from main.utils import UFs
from registry.pagination import PagesPagination
from .models import (
    DengueGlobal,
    HistoricoAlerta,
    HistoricoAlertaZika,
    HistoricoAlertaChik,
    CopernicusBrasil,
)
from .schema import (
    HistoricoAlertaSchema,
    HistoricoAlertaFilterSchema,
    CopernicusBrasilSchema,
    CopernicusBrasilFilterSchema,
    ContaOvosSchema,
)


router = Router()

paginator = PagesPagination
paginator.max_per_page = 100


@router.get(
    "/historico_alerta/",
    response={
        200: List[HistoricoAlertaSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_historico_alerta(
    request,
    disease: Literal["dengue", "zika", "chik"],
    filters: HistoricoAlertaFilterSchema = Query(...),
    # fmt: off
    uf: Optional[Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]] = None,
    # fmt: on
    **kwargs,
):
    disease = disease.lower()

    try:
        if disease in ["chik", "chikungunya"]:
            data = HistoricoAlertaChik.objects.using("infodengue").all()
        elif disease in ["deng", "dengue"]:
            data = HistoricoAlerta.objects.using("infodengue").all()
        elif disease == "zika":
            data = HistoricoAlertaZika.objects.using("infodengue").all()
        else:
            return 404, {"message": "Unknown disease. Options: dengue, zika, chik"}
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()
        if uf not in list(UFs):
            return 404, {"message": "Unkown UF. Format: SP"}
        uf_name = UFs[uf]
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(municipio_geocodigo__in=geocodes)

    data = filters.filter(data)
    return data.order_by("-data_iniSE")


@router.get(
    "/copernicus_brasil/",
    response={
        200: List[CopernicusBrasilSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil(
    request,
    filters: CopernicusBrasilFilterSchema = Query(...),
    # fmt: off
    uf: Optional[Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]] = None,
    # fmt: on
    **kwargs,
):
    try:
        data = CopernicusBrasil.objects.using("infodengue").all()
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()
        if uf not in list(UFs):
            return 404, {"message": "Unkown UF. Format: SP"}
        uf_name = UFs[uf]
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(geocodigo__in=geocodes)

    data = filters.filter(data)
    return data


@router.get(
    "/contaovos/",
    response={
        200: List[ContaOvosSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "contaovos"],
)
@csrf_exempt
def get_contaovos(request, key: str, page: int):
    url = "https://contaovos.dengue.mat.br/pt-br/api/lastcounting"
    data = {"key": key, "page": page}
    response = requests.get(url, data=data, timeout=20)

    if response.status_code == 200:
        return 200, [ContaOvosSchema(**i) for i in response.json()]
    elif response.status_code == 500:
        return 500, {"message": "Internal error. Please contact the moderation"}
    return 404, {"message": response.json()}
