import logging
from typing import Optional

from celery.schedules import crontab
from celery.signals import worker_ready
from django.db.models import Sum, Max
from django.core.cache import cache

from mosqlimate.celeryapp import app

from registry.models import Prediction
from vis.dash.line_chart import calculate_score
from .models import TotalCases, TotalCases100kHab
from .plots.home.vis_charts import (
    uf_ibge_mapping,
    historico_alerta_data_for,
    get_total_cases,
    get_total_cases_100k_hab,
)

app.conf.beat_schedule = {
    "update-total-cases-daily": {
        "task": "vis.tasks.update_total_cases_task",
        "schedule": crontab(hour=1, minute=0),
    },
    "update-total-cases-100k-hab-daily": {
        "task": "vis.tasks.update_total_cases_100k_hab_task",
        "schedule": crontab(hour=1, minute=15),
    },
    "update-prediction-scores-daily": {
        "task": "vis.tasks.update_prediction_scores",
        "schedule": crontab(hour=3, minute=0),
    },
}


@app.task
def update_prediction_scores(prediction_ids: Optional[list[int]] = None):
    if not prediction_ids:
        predictions = Prediction.objects.all()
    else:
        predictions = Prediction.objects.filter(id__in=prediction_ids)

    for prediction in predictions:
        scores = calculate_score(prediction.id)

        if scores != prediction.scores:
            # cache.delete("get_predictions")
            cache.clear()
            prediction.mae = scores["mae"]
            prediction.mse = scores["mse"]
            prediction.crps = scores["crps"]
            prediction.log_score = scores["log_score"]
            prediction.interval_score = scores["interval_score"]
            prediction.wis = scores["wis"]
            prediction.save()


@worker_ready.connect
def at_start(sender, **k):
    with sender.app.connection() as conn:
        sender.app.send_task(
            "vis.tasks.populate_total_cases_task",
            kwargs={"t100k_hab": False},
            connection=conn,
        )
        sender.app.send_task(
            "vis.tasks.populate_total_cases_task",
            kwargs={"t100k_hab": True},
            connection=conn,
        )
        logging.warning("EXECUTING vis.tasks.populate_total_cases_task")


@app.task
def update_total_cases_task():
    """
    Updates TotalCases for the current year
    """
    diseases = ["dengue", "chikungunya", "zika"]

    for disease in diseases:
        for uf in uf_ibge_mapping:
            update_total_cases(disease, uf, False)


@app.task
def update_total_cases_100k_hab_task():
    """
    Updates TotalCases100kHab for the current year
    """
    diseases = ["dengue", "chikungunya", "zika"]

    for disease in diseases:
        for uf in uf_ibge_mapping:
            update_total_cases(disease, uf, True)


@app.task
def populate_total_cases_task(t100k_hab: bool, year: Optional[int] = None):
    """
    Populates TotalCases and TotalCases100kHab retroactive
    """
    if year:
        if year < 2010:
            raise ValueError(
                "populate_total_cases_task reached its year limit"
            )

    diseases = ["dengue", "chikungunya", "zika"]

    for disease in diseases:
        for uf in uf_ibge_mapping:
            update_total_cases(disease, uf, t100k_hab, year)


def update_total_cases(
    disease: str, uf: str, is_100k_hab: bool, year: Optional[int] = None
):
    """
    Recalculate HistoricoAlerta total cases and total cases by 100k hab,
    updating the values for the current year
    """
    data = historico_alerta_data_for(disease)

    if not year:
        last_available_year = data.aggregate(max_year=Max("data_iniSE__year"))[
            "max_year"
        ]
        year = last_available_year

    if is_100k_hab:
        total_cases = TotalCases100kHab
        get_cases = get_total_cases_100k_hab
    else:
        total_cases = TotalCases
        get_cases = get_total_cases

    try:
        obj = total_cases.objects.get(uf=uf, year=year, disease=disease)
    except total_cases.DoesNotExist:
        get_cases(disease, uf, year)
        update_total_cases(disease, uf, is_100k_hab)
        return

    uf_code = uf_ibge_mapping[uf]["code"]

    historico_alerta_total_cases = (
        data.filter(
            municipio_geocodigo__startswith=uf_code,
            data_iniSE__year=year,
        ).aggregate(total_cases=Sum("casos"))
    )["total_cases"]

    if is_100k_hab:
        historico_alerta_total_pop = (
            data.filter(
                municipio_geocodigo__startswith=uf_code,
                data_iniSE__year=year,
            ).aggregate(total_pop=Sum("pop"))
        )["total_pop"]

        cases_per_100k_hab = (
            historico_alerta_total_cases / historico_alerta_total_pop * 100000
        )

        cases = float(f"{cases_per_100k_hab:.2f}")
    else:
        cases = historico_alerta_total_cases

    obj.total_cases = cases
    obj.save()
    logging.info(f"{obj} updated cases to {cases}")
