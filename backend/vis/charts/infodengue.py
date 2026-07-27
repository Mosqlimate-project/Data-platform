from typing import Any, List, Literal, Optional

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache

from users.auth import ChartAuth
from main.utils import UFs
from main.models import APILog
from datastore.models import (
    Municipio,
    HistoricoAlerta,
    HistoricoAlertaZika,
    HistoricoAlertaChik,
)
from vis.throttle import SdkThrottle
from vis.charts.schema import (
    InfodengueChartIn,
    InfodengueRtOut,
    InfodengueTotalCasesOut,
)

router = Router(tags=["charts"])
auth = ChartAuth()
throttle = SdkThrottle()


def get_infodengue_queryset(
    disease: Literal["dengue", "chikungunya", "zika"], uf: Optional[str] = None
):
    disease = disease.lower()  # type: ignore[assignment]

    if disease in ["chik", "chikungunya"]:
        qs: Any = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        qs = HistoricoAlerta.objects.using("infodengue").all()  # type: ignore[assignment]
    elif disease == "zika":
        qs = HistoricoAlertaZika.objects.using("infodengue").all()  # type: ignore[assignment]
    else:
        return None

    if uf:
        uf = uf.upper()  # type: ignore[no-redef]
        if uf in UFs:
            uf_name = UFs[uf]
            geocodes = (
                Municipio.objects.using("infodengue")
                .filter(uf=uf_name)
                .values_list("geocodigo", flat=True)
            )
            qs = qs.filter(municipio_geocodigo__in=geocodes)
        else:
            raise ValueError("Invalid UF")

    return qs


@decorate_view(never_cache)
@router.get(
    "/charts/infodengue/rt/",
    response={200: List[InfodengueRtOut], 404: dict},
    auth=auth,
    throttle=throttle,
)
def charts_infodengue_rt(
    request,
    payload: InfodengueChartIn = Query(...),
):
    APILog.from_request(request)
    qs = get_infodengue_queryset(payload.disease)  # type: ignore[arg-type]

    if qs is None:
        return 404, {"message": "Unknown disease"}

    data = (
        qs.filter(
            municipio_geocodigo=payload.geocode,
            data_iniSE__gte=payload.start,
            data_iniSE__lte=payload.end,
        )
        .values("data_iniSE", "Rt")
        .order_by("data_iniSE")
    )

    return list(data)


@decorate_view(never_cache)
@router.get(
    "/charts/infodengue/total-cases/",
    response={200: InfodengueTotalCasesOut, 404: dict},
    auth=auth,
    throttle=throttle,
)
def charts_infodengue_total_cases(
    request,
    payload: InfodengueChartIn = Query(...),
):
    APILog.from_request(request)
    from django.db.models import Sum

    qs = get_infodengue_queryset(payload.disease)  # type: ignore[arg-type]

    if qs is None:
        return 404, {"message": "Unknown disease"}

    qs = qs.filter(
        municipio_geocodigo=payload.geocode,
        data_iniSE__gte=payload.start,
        data_iniSE__lte=payload.end,
    )

    total = qs.aggregate(total=Sum("casos"))["total"] or 0

    return {"total_cases": total}
