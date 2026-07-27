from typing import List

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache

from users.auth import ChartAuth
from main.models import APILog
from datastore.models import CopernicusBrasil
from vis.throttle import SdkThrottle
from vis.charts.schema import (
    ClimateChartIn,
    ClimateTemperatureOut,
    ClimateAccumulatedWaterfallOut,
    ClimateHumidityPressureOut,
)

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
            "precip_tot",
            "precip_med",
        )
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
