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
from .models import ResultsProbLSTM, GeoMacroSaude
from .schema import ResultsProbLSTMSchema, ResultsProbLSTMFilterSchema


router = Router()
uidkey = UidKeyAuth()


@router.get(
    "/vis/brasil/results-prob-lstm/",
    response={
        200: List[ResultsProbLSTMSchema],
        422: UnprocessableContentSchema,
    },
    auth=django_auth,
    include_in_schema=False,
)
@paginate(PagesPagination)
def list_results_prob_lstm(
    request,
    filters: ResultsProbLSTMFilterSchema = Query(...),
    **kwargs,
):
    try:
        date.fromisoformat(str(filters.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }
    objs = ResultsProbLSTM.objects.all()
    objs = filters.filter(objs)
    return objs.order_by("-date")


@router.post(
    "/vis/brasil/results-prob-lstm/",
    response={
        201: ResultsProbLSTMSchema,
        403: ForbiddenSchema,
        422: UnprocessableContentSchema,
    },
    auth=uidkey,
    include_in_schema=False,
)
@csrf_exempt
def post_results_prob_lstm(request, payload: ResultsProbLSTMSchema):
    try:
        date.fromisoformat(str(payload.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }

    data = payload.dict()
    try:
        data["macroregion"] = GeoMacroSaude.objects.get(pk=data["macroregion"])
    except GeoMacroSaude.DoesNotExist:
        return 422, {"message": f"Unknown macroregion {data['macroregion']}"}

    obj = ResultsProbLSTM(**data)

    try:
        obj.save()
    except IntegrityError:
        return 403, {
            "message": (
                "LSTM Result for this date and macroregional already inserted"
            )
        }

    return 201, obj
