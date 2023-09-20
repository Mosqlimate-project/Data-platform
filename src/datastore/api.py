from typing import List

from ninja import Router, Query
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt

from .models import HistoricoAlerta
from .schema import HistoricoAlertaSchema, HistoricoAlertaFilterSchema
from registry.pagination import PagesPagination


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
    data = HistoricoAlerta.objects.using("Municipio").all()
    data = filters.filter(data)
    return data.order_by("-data_iniSE")
