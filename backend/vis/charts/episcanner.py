from typing import List

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache
from django.core.cache import cache

from users.auth import ChartAuth
from main.utils import UFs
from main.models import APILog
from datastore.models import Adm2, EpiscannerSirParams
from vis.throttle import SdkThrottle
from vis.charts.schema import (
    EpiscannerChartIn,
    EpiscannerChartOut,
)

router = Router(tags=["charts"])
auth = ChartAuth()
throttle = SdkThrottle()

DISEASE_CID10 = {
    "dengue": "A90",
    "chikungunya": "A92.0",
    "zika": "A92.5",
}


@decorate_view(never_cache)
@router.get(
    "/charts/episcanner/",
    response=List[EpiscannerChartOut],
    auth=auth,
    throttle=throttle,
)
def charts_episcanner(
    request,
    payload: EpiscannerChartIn = Query(...),
):
    APILog.from_request(request)

    cache_key = f"episcanner:{payload.disease}:{payload.uf}:{payload.year}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    cid10 = DISEASE_CID10[payload.disease]

    geocodes_in_state = [
        int(g)
        for g in Adm2.objects.filter(adm1__name=UFs[payload.uf]).values_list(
            "geocode", flat=True
        )
    ]

    rows = (
        EpiscannerSirParams.objects.using("infodengue")
        .filter(
            cid10=cid10,
            year=payload.year,
            geocode__in=geocodes_in_state,
        )
        .values(
            "cid10",
            "geocode",
            "year",
            "ep_ini",
            "ep_pw",
            "ep_end",
            "ep_dur",
            "peak_week",
            "beta",
            "gamma",
            "r0",
            "total_cases",
            "alpha",
            "sum_res",
        )
    )

    adm2_names = {
        a.geocode: a.name
        for a in Adm2.objects.filter(
            geocode__in=[str(g) for g in geocodes_in_state]
        )
    }

    objs = [
        EpiscannerChartOut(
            disease=payload.disease,
            CID10=r["cid10"],
            year=r["year"],
            geocode=r["geocode"],
            muni_name=adm2_names.get(str(r["geocode"]), ""),
            peak_week=r["peak_week"],
            beta=r["beta"],
            gamma=r["gamma"],
            R0=r["r0"],
            total_cases=r["total_cases"],
            alpha=r["alpha"],
            sum_res=r["sum_res"],
            ep_ini=r["ep_ini"],
            ep_end=r["ep_end"],
            ep_dur=r["ep_dur"],
        )
        for r in rows
    ]

    cache.set(cache_key, objs, timeout=86400)
    return objs
