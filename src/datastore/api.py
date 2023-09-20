from typing import List

from ninja import Router, Query
from django.views.decorators.csrf import csrf_exempt

from .models import HistoricoAlerta
from .schema import HistoricoAlertaSchema, HistoricoAlertaFilterSchema


router = Router()


@router.get(
    "/historico_alerta/",
    response=List[HistoricoAlertaSchema],
    tags=["datastore", "infodengue"],
)
@csrf_exempt
def get_historico_alerta(
    request,
    filters: HistoricoAlertaFilterSchema = Query(...),
    **kwargs,
):
    data = HistoricoAlerta.objects.using("Municipio").all()
    data = filters.filter(data)
    return data.order_by("-data_iniSE")
