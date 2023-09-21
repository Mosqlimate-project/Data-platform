from typing import List

from ninja import Router, Query
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt

from registry.pagination import PagesPagination
from .models import HistoricoAlerta, CopernicusBrasil
from .schema import (
    HistoricoAlertaSchema,
    HistoricoAlertaFilterSchema,
    CopernicusBrasilSchema,
    CopernicusBrasilFilterSchema,
)


router = Router()

paginator = PagesPagination
paginator.max_per_page = 100


@router.get(
    "/historico_alerta/",
    response=List[HistoricoAlertaSchema],
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_historico_alerta(
    request,
    filters: HistoricoAlertaFilterSchema = Query(...),
    **kwargs,
):
    data = HistoricoAlerta.objects.using("infodengue").all()
    data = filters.filter(data)
    return data.order_by("-data_iniSE")


@router.get(
    "/copernicus_brasil/",
    response=List[CopernicusBrasilSchema],
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil(
    request,
    filters: CopernicusBrasilFilterSchema = Query(...),
    **kwargs,
):
    data = CopernicusBrasil.objects.using("infodengue").all()
    data = filters.filter(data)
    return data
