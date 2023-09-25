from typing import List, Literal

from ninja import Router, Query
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt

from registry.pagination import PagesPagination
from main.schema import NotFoundSchema
from .models import (
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
)


router = Router()

paginator = PagesPagination
paginator.max_per_page = 100


@router.get(
    "/historico_alerta/",
    response={200: List[HistoricoAlertaSchema], 404: NotFoundSchema},
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_historico_alerta(
    request,
    disease: Literal["dengue", "zika", "chik"],
    filters: HistoricoAlertaFilterSchema = Query(...),
    **kwargs,
):
    disease = disease.lower()

    if disease in ["chik", "chikungunya"]:
        data = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        data = HistoricoAlerta.objects.using("infodengue").all()
    elif disease == "zika":
        data = HistoricoAlertaZika.objects.using("infodengue").all()
    else:
        return 404, {"message": "Unknown disease. Options: dengue, zika, chik"}

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
