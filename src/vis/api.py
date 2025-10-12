from datetime import date
from typing import Literal, List
from collections import defaultdict

from main.schema import (
    UnprocessableContentSchema,
    ForbiddenSchema,
    BadRequestSchema,
)
from users.auth import UidKeyAuth
from datastore.models import (
    HistoricoAlertaZika,
    HistoricoAlertaChik,
    HistoricoAlerta,
)
from registry.models import Prediction, PredictionDataRow, Model, Tag
from vis.dash.line_chart import hist_alerta_data
from vis import models, schema, filters
from vis.brasil.models import City

import pandas as pd
from ninja import Router, Query
from ninja.security import django_auth
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, IntegerField
from django.db.models.functions import Cast, Round


router = Router()
uidkey_auth = UidKeyAuth()


@router.get(
    "/dashboard/line-chart/",
    response={200: schema.DashboardLineChartOut, 400: BadRequestSchema},
    # auth=django_auth,
    # include_in_schema=False,
)
def dashboard_line_chart(
    request, filters: filters.DashboardLineChart = Query(...)
):
    match filters.disease:
        case "dengue":
            historico_alerta = HistoricoAlerta.objects.using("infodengue")
        case "chikungunya":
            historico_alerta = HistoricoAlertaChik.objects.using("infodengue")
        case "zika":
            historico_alerta = HistoricoAlertaZika.objects.using("infodengue")
        case _:
            raise ValueError(f"Unknown disease {filters.disease}")

    predictions = Prediction.objects.filter(
        id__in=filters.preds,
        model__sprint=filters.sprint,
    ).distinct()

    if filters.adm_level == 1 and filters.adm_1:
        geocodes = list(
            City.objects.filter(
                microregion__mesoregion__state__uf=filters.adm_1
            )
            .annotate(geocode_int=Cast("geocode", IntegerField()))
            .values_list("geocode_int", flat=True)
        )
    elif filters.adm_level == 2 and filters.adm_2:
        geocodes = [filters.adm_2]
    else:
        return 400, {"message": "ADM1 or ADM2 is missing"}

    historico_alerta = (
        historico_alerta.filter(
            data_iniSE__range=(filters.start, filters.end),
            municipio_geocodigo__in=geocodes,
        )
        .values("data_iniSE")
        .annotate(casos=Sum("casprov" if filters.sprint else "casos"))
        .order_by("data_iniSE")
    )

    dates = pd.date_range(filters.start, filters.end, freq="D").date.tolist()

    casos_dict = {row["data_iniSE"]: row["casos"] for row in historico_alerta}
    cases = [casos_dict.get(d, None) for d in dates]

    rows = (
        PredictionDataRow.objects.filter(
            predict__in=predictions, date__range=(filters.start, filters.end)
        )
        .annotate(
            pred_r=Round("pred", 2),
            lower_95_r=Round("lower_95", 2),
            lower_90_r=Round("lower_90", 2),
            lower_80_r=Round("lower_80", 2),
            lower_50_r=Round("lower_50", 2),
            upper_50_r=Round("upper_50", 2),
            upper_80_r=Round("upper_80", 2),
            upper_90_r=Round("upper_90", 2),
            upper_95_r=Round("upper_95", 2),
        )
        .values(
            "predict_id",
            "date",
            "pred_r",
            "lower_95_r",
            "lower_90_r",
            "lower_80_r",
            "lower_50_r",
            "upper_50_r",
            "upper_80_r",
            "upper_90_r",
            "upper_95_r",
        )
    )

    by_date = defaultdict(list)

    for row in rows:
        by_date[row["date"]].append(
            schema.DashboardLineChartPredictions(
                predict_id=row["predict_id"],
                pred=row["pred_r"],
                lower_95=row["lower_95_r"],
                lower_90=row["lower_90_r"],
                lower_80=row["lower_80_r"],
                lower_50=row["lower_50_r"],
                upper_50=row["upper_50_r"],
                upper_80=row["upper_80_r"],
                upper_90=row["upper_90_r"],
                upper_95=row["upper_95_r"],
            )
        )

    preds_by_date = [by_date.get(d, None) for d in dates]

    return schema.DashboardLineChartOut(
        dates=dates,
        cases=cases,
        preds=preds_by_date,
    )


@router.get(
    "/dashboard/tags/",
    response=schema.DashboardTagsOut,
    # auth=django_auth,
    include_in_schema=False,
)
def dashboard_tags(request, filters: filters.DashboardParams = Query(...)):
    predictions = Prediction.objects.filter(
        model__sprint=filters.sprint,
        model__disease=filters.disease,
        model__adm_level=filters.adm_level,
    )

    if filters.adm_level == 1 and filters.adm_1:
        predictions = predictions.filter(adm_1__uf=filters.adm_1)
    elif filters.adm_level == 2 and filters.adm_2:
        predictions = predictions.filter(adm_2__geocode=filters.adm_2)
    else:
        return 400, {"message": "ADM1 or ADM2 is missing"}

    model_tags = Tag.objects.filter(
        model_tags__in=predictions.values_list("model_id", flat=True)
    ).distinct()

    prediction_tags = Tag.objects.filter(
        prediction_tags__in=predictions.values_list("id", flat=True)
    ).distinct()

    return {"models": model_tags, "preds": prediction_tags}


@router.get(
    "/dashboard/models/",
    response=List[schema.DashboardModelOut],
    # auth=django_auth,
    include_in_schema=False,
)
def dashboard_models(request, filters: filters.DashboardParams = Query(...)):
    predictions = Prediction.objects.filter(
        model__sprint=filters.sprint,
        model__disease=filters.disease,
        model__adm_level=filters.adm_level,
    )

    if filters.tags:
        predictions = predictions.filter(model__tags__id__in=filters.tags)

    if filters.adm_level == 1 and filters.adm_1:
        predictions = predictions.filter(adm_1__uf=filters.adm_1)
    elif filters.adm_level == 2 and filters.adm_2:
        predictions = predictions.filter(adm_2__geocode=filters.adm_2)
    else:
        return 400, {"message": "ADM1 or ADM2 is missing"}

    return (
        Model.objects.filter(predictions__in=predictions)
        .distinct()
        .values("id", "name", "author__user__name")
    )


@router.get(
    "/dashboard/predictions/",
    response=List[schema.DashboardPredictionOut],
    # auth=django_auth,
    include_in_schema=False,
)
def dashboard_predictions(
    request, filters: filters.DashboardPredictions = Query(...)
):
    predictions = Prediction.objects.filter(
        model__sprint=filters.sprint,
        model__disease=filters.disease,
        model__adm_level=filters.adm_level,
    )

    if filters.tags:
        predictions = predictions.filter(model__tags__id__in=filters.tags)

    if filters.models:
        predictions = predictions.filter(model__id__in=filters.models)

    if filters.adm_level == 1 and filters.adm_1:
        predictions = predictions.filter(adm_1__uf=filters.adm_1)
    elif filters.adm_level == 2 and filters.adm_2:
        predictions = predictions.filter(adm_2__geocode=filters.adm_2)
    else:
        return 400, {"message": "ADM1 or ADM2 is missing"}

    def safe_round(value, ndigits=2):
        return round(value, ndigits) if value is not None else None

    return [
        schema.DashboardPredictionOut(
            id=p.id,
            model=p.model.id,
            author=p.model.author.user.name if p.model.author else "-",
            year=p.data.order_by("date").first().date.year,
            start=p.data.order_by("date").first().date,
            end=p.data.order_by("date").last().date,
            scores=[
                schema.PredictionScore(name="mae", score=safe_round(p.mae)),
                schema.PredictionScore(name="mse", score=safe_round(p.mse)),
                schema.PredictionScore(name="crps", score=safe_round(p.crps)),
                schema.PredictionScore(
                    name="log_score", score=safe_round(p.log_score)
                ),
                schema.PredictionScore(
                    name="interval_score", score=safe_round(p.interval_score)
                ),
                schema.PredictionScore(name="wis", score=safe_round(p.wis)),
            ],
        )
        for p in predictions
    ]


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
