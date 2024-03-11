from typing import List
from datetime import date

from ninja import Router, Query
from ninja.security import django_auth
from ninja.pagination import paginate
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt

from registry.pagination import PagesPagination
from main.schema import UnprocessableContentSchema, ForbiddenSchema
from users.auth import UidKeyAuth
from .models import ResultsProbForecast, GeoMacroSaude
from .schema import ResultsProbForecastSchema, ResultsProbForecastFilterSchema


router = Router()
uidkey = UidKeyAuth()


@router.get(
    "/results-prob-forecast/",
    response={
        200: List[ResultsProbForecastSchema],
        422: UnprocessableContentSchema,
    },
    auth=django_auth,
    include_in_schema=True,
)
@paginate(PagesPagination)
def list_results_prob_forecast(
    request,
    filters: ResultsProbForecastFilterSchema = Query(...),
    **kwargs,
):
    try:
        date.fromisoformat(str(filters.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }
    objs = ResultsProbForecast.objects.all()
    objs = filters.filter(objs)
    return objs.order_by("-date")


@router.post(
    "/results-prob-forecast/",
    response={
        201: ResultsProbForecastSchema,
        403: ForbiddenSchema,
        422: UnprocessableContentSchema,
    },
    auth=uidkey,
    include_in_schema=True,
)
@csrf_exempt
def post_results_prob_forecast(request, payload: ResultsProbForecastSchema):
    try:
        date.fromisoformat(str(payload.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }

    data = payload.dict()
    try:
        data["geocode"] = GeoMacroSaude.objects.get(pk=data["geocode"])
    except GeoMacroSaude.DoesNotExist:
        return 422, {"message": f"Unknown geocode {data['geocode']}"}

    obj = ResultsProbForecast(**data)

    try:
        obj.save()
    except IntegrityError:
        return 403, {
            "message": (
                "Forecast Result for this date and geocode already inserted"
            )
        }

    data["geocode"] = data["geocode"].geocode

    return 201, data
