from typing import List

import datetime

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache
from django.db.models import F, Subquery, OuterRef, CharField
from django.db.models.functions import Coalesce, Cast

from users.auth import ChartAuth
from main.models import APILog
from datastore.models import CopernicusBrasil, CopernicusBrasilPrecipFixed
from vis.throttle import SdkThrottle
from vis.charts.schema import (
    ClimateChartIn,
    ClimateTemperatureOut,
    ClimateAccumulatedWaterfallOut,
    ClimateHumidityPressureOut,
)

PRECIP_FIXED_CUTOFF = datetime.date(2026, 8, 1)

router = Router(tags=["charts"])
auth = ChartAuth()
throttle = SdkThrottle()


@decorate_view(never_cache)
@router.get(
    "/charts/climate/temperature/",
    response=List[ClimateTemperatureOut],
    auth=auth,
    throttle=throttle,
)
def charts_climate_daily_temperature(
    request,
    payload: ClimateChartIn = Query(...),
):
    APILog.from_request(request)
    return (
        CopernicusBrasil.objects.using("infodengue")
        .filter(
            geocodigo=payload.geocode,
            date__gte=payload.start,
            date__lte=payload.end,
        )
        .order_by("date")
        .values(
            "date",
            "epiweek",
            "temp_min",
            "temp_med",
            "temp_max",
        )
    )


@decorate_view(never_cache)
@router.get(
    "/charts/climate/accumulated-waterfall/",
    response=List[ClimateAccumulatedWaterfallOut],
    auth=auth,
    throttle=throttle,
)
def charts_climate_daily_accumulated_waterfall(
    request,
    payload: ClimateChartIn = Query(...),
):
    APILog.from_request(request)
    qs = (
        CopernicusBrasil.objects.using("infodengue")
        .filter(
            geocodigo=payload.geocode,
            date__gte=payload.start,
            date__lte=payload.end,
        )
        .order_by("date")
    )

    if payload.precip_fixed and payload.start < PRECIP_FIXED_CUTOFF:
        qs = qs.annotate(
            _pf_tot=Coalesce(
                Subquery(
                    CopernicusBrasilPrecipFixed.objects.using("infodengue")
                    .filter(
                        date=OuterRef("date"),
                        geocode=Cast(
                            OuterRef("geocodigo"),
                            output_field=CharField(),
                        ),
                    )
                    .values("precip_tot")[:1]
                ),
                F("precip_tot"),
            ),
            _pf_med=Coalesce(
                Subquery(
                    CopernicusBrasilPrecipFixed.objects.using("infodengue")
                    .filter(
                        date=OuterRef("date"),
                        geocode=Cast(
                            OuterRef("geocodigo"),
                            output_field=CharField(),
                        ),
                    )
                    .values("precip_med")[:1]
                ),
                F("precip_med"),
            ),
        )
        qs = qs.values("date", "epiweek")
        return qs.annotate(
            precip_tot=F("_pf_tot"),
            precip_med=F("_pf_med"),
        )

    return qs.values(
        "date",
        "epiweek",
        "precip_tot",
        "precip_med",
    )


@decorate_view(never_cache)
@router.get(
    "/charts/climate/umid-pressao-med/",
    response=List[ClimateHumidityPressureOut],
    auth=auth,
    throttle=throttle,
)
def charts_climate_daily_umid_press_med(
    request,
    payload: ClimateChartIn = Query(...),
):
    APILog.from_request(request)
    return (
        CopernicusBrasil.objects.using("infodengue")
        .filter(
            geocodigo=payload.geocode,
            date__gte=payload.start,
            date__lte=payload.end,
        )
        .order_by("date")
        .values(
            "date",
            "epiweek",
            "umid_med",
            "pressao_med",
        )
    )
