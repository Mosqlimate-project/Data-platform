from typing import List
from datetime import date

from ninja import Router, Query
from ninja.security import django_auth
from ninja.pagination import paginate
from django.db import IntegrityError

from registry.pagination import PagesPagination
from main.schema import UnprocessableContentSchema, ForbiddenSchema
from .models import ResultsProbLSTM
from .schema import ResultsProbLSTMSchema, ResultsProbLSTMFilterSchema


router = Router()


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
    auth=django_auth,
    include_in_schema=False,
)
def post_results_prob_lstm(request, payload: ResultsProbLSTMSchema):
    try:
        date.fromisoformat(str(payload.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }

    obj = ResultsProbLSTM(**payload.dict())

    try:
        obj.save()
    except IntegrityError:
        return 403, {
            "message": (
                "LSTM Result for this date and macroregional already inserted"
            )
        }
    return 201, obj
