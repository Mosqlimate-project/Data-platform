from typing import List

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.db.models import F, Sum, Count, Q
from django.views.decorators.cache import never_cache

from users.auth import ChartAuth
from main.utils import UF_CODES, CODES_UF
from main.models import APILog
from datastore.models import ContaOvos
from vis.throttle import SdkThrottle
from vis.charts.schema import (
    ContaOvosChartIn,
    ContaOvosPositivityIn,
    ContaOvosMapIn,
    ContaOvosEggsDensityOut,
    ContaOvosPositivityOut,
    ContaOvosMapStateOut,
    ContaOvosMapScatterOut,
)

router = Router(tags=["charts"])
auth = ChartAuth()
throttle = SdkThrottle()


@decorate_view(never_cache)
@router.get(
    "/charts/contaovos/eggs_density/",
    response=List[ContaOvosEggsDensityOut],
    auth=auth,
    throttle=throttle,
)
def charts_contaovos(
    request,
    payload: ContaOvosChartIn = Query(...),
):
    APILog.from_request(request)
    qs = ContaOvos.objects.filter(date__range=(payload.start, payload.end))

    if payload.uf:
        qs = qs.filter(adm2__adm1=UF_CODES[payload.uf.upper()])
    elif payload.geocode:
        qs = qs.filter(adm2=payload.geocode)

    qs = (
        qs.values("year", "week")  # type: ignore[assignment]
        .annotate(total_eggs=Sum("eggs"))
        .order_by("year", "week")
    )

    return [
        {
            "epiweek": f"{row['year']}-{str(row['week']).zfill(2)}",  # type: ignore[index]
            "total_eggs": row["total_eggs"],  # type: ignore[index]
        }
        for row in qs
    ]


@decorate_view(never_cache)
@router.get(
    "/charts/contaovos/positivity/",
    response=List[ContaOvosPositivityOut],
    auth=auth,
    throttle=throttle,
)
def charts_contaovos_positivity(
    request,
    payload: ContaOvosPositivityIn = Query(...),
):
    APILog.from_request(request)
    qs = ContaOvos.objects.filter(date__range=(payload.start, payload.end))

    if payload.uf:
        qs = qs.filter(adm2__adm1=UF_CODES[payload.uf.upper()])

    data = (
        qs.annotate(
            group=F("adm2__name") if payload.uf else F("adm2__adm1__geocode")
        )
        .values("group")
        .annotate(
            total_traps=Count("ovitrap_website_id", distinct=True),
            pos_traps=Count(
                "ovitrap_website_id", distinct=True, filter=Q(eggs__gt=0)
            ),
        )
    )

    result = []
    for row in data:
        name = row["group"]
        if not payload.uf:
            name = CODES_UF.get(int(name), str(name))
        positivity = round(
            (
                (row["pos_traps"] / row["total_traps"] * 100)
                if row["total_traps"]
                else 0
            ),
            2,
        )
        result.append({"name": name, "positivity": positivity})

    result.sort(key=lambda x: x["positivity"], reverse=True)
    return result


@decorate_view(never_cache)
@router.get(
    "/charts/contaovos/map/",
    response=List[ContaOvosMapStateOut],
    auth=auth,
    throttle=throttle,
)
def charts_contaovos_map(
    request,
    payload: ContaOvosMapIn = Query(...),
):
    APILog.from_request(request)
    qs = ContaOvos.objects.filter(date__range=(payload.start, payload.end))

    states = (
        qs.annotate(state_code_num=F("adm2__adm1__geocode"))
        .values("state_code_num")
        .annotate(
            total_eggs=Sum("eggs"),
            trap_count=Count("ovitrap_website_id", distinct=True),
            municipality_count=Count("adm2", distinct=True),
        )
    )

    state_data = []
    for row in states:
        name = CODES_UF.get(
            int(row["state_code_num"]),
            str(row["state_code_num"]),
        )
        state_data.append(
            {
                "name": name,
                "total_eggs": row["total_eggs"],
                "trap_count": row["trap_count"],
                "municipality_count": row["municipality_count"],
            }
        )

    return state_data


@decorate_view(never_cache)
@router.get(
    "/charts/contaovos/map/scatter/",
    response=List[ContaOvosMapScatterOut],
    auth=auth,
    throttle=throttle,
)
def charts_contaovos_map_scatter(
    request,
    payload: ContaOvosMapIn = Query(...),
):
    APILog.from_request(request)
    qs = ContaOvos.objects.filter(date__range=(payload.start, payload.end))

    scatter_qs = (
        qs.filter(
            latitude__gte=-33.8,
            latitude__lte=5.3,
            longitude__gte=-74.0,
            longitude__lte=-34.8,
        )
        .annotate(
            state_code=F("adm2__adm1__geocode"),
            trap_id=F("ovitrap_website_id"),
            municipality=F("adm2__name"),
        )
        .values(
            "state_code", "latitude", "longitude", "trap_id", "municipality"
        )
    )

    scatter_data = []
    for row in scatter_qs:
        name = CODES_UF.get(int(row["state_code"]), str(row["state_code"]))
        scatter_data.append(
            {
                "name": name,
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "trap_id": row["trap_id"],
                "municipality": row["municipality"],
            }
        )

    return scatter_data
