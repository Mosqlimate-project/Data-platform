from datetime import date
from typing import Literal, List

from ninja import Router
from ninja.security import django_auth
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt

from main.schema import UnprocessableContentSchema, ForbiddenSchema
from users.auth import UidKeyAuth
from .dash.line_chart import hist_alerta_data
from . import models
from . import schema


router = Router()
uidkey_auth = UidKeyAuth()


@router.get(
    "/cases/",
    response=List[schema.HistoricoAlertaCases],
    auth=django_auth,
    include_in_schema=False,
)
def get_cases(request, payload: schema.HistoricoAlertaCasesIn):
    df = hist_alerta_data(
        sprint=payload.sprint,
        disease=payload.disease,
        start_window_date=payload.start,
        end_window_date=payload.end,
        adm_level=payload.adm_level,
        adm_1=payload.adm_1,
        adm_2=payload.adm_2,
    )

    if df.empty:
        return list()

    df = df.sort_values(by="date")

    res = []
    for _, row in df.iterrows():
        res.append(
            schema.HistoricoAlertaCases(date=row["date"], cases=row["target"])
        )
    return res


@router.get(
    "/total-cases/",
    response=List[schema.TotalCasesSchema],
    # auth=uidkey_auth,
    include_in_schema=False,
)
@csrf_exempt
def get_total_cases(
    request,
    year: int,
    disease: Literal["dengue", "chikungunya", "zika"],
    per_100k: bool = False,
):
    if per_100k:
        total_cases = models.TotalCases100kHab
    else:
        total_cases = models.TotalCases
    return total_cases.objects.filter(year=year, disease=disease)


@router.post(
    "/results-prob-forecast/",
    response={
        201: schema.ResultsProbForecastSchema,
        403: ForbiddenSchema,
        422: UnprocessableContentSchema,
    },
    auth=uidkey_auth,
    include_in_schema=True,
)
@csrf_exempt
def post_results_prob_forecast(
    request, payload: schema.ResultsProbForecastSchema
):
    if payload.disease == "chik":
        payload.disease = "chikungunya"

    if payload.disease not in ["dengue", "zika", "chikungunya"]:
        return 422, {
            "message": (
                "Incorrect disease, options: ['dengue', 'zika', 'chikungunya']"
            )
        }

    try:
        date.fromisoformat(str(payload.date))
    except ValueError:
        return 422, {
            "message": "Incorrect date format, please use isoformat: YYYY-MM-dd"
        }

    data = payload.dict()
    try:
        data["geocode"] = models.GeoMacroSaude.objects.get(pk=data["geocode"])
    except models.GeoMacroSaude.DoesNotExist:
        return 422, {"message": f"Unknown geocode {data['geocode']}"}

    obj = models.ResultsProbForecast(**data)

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
