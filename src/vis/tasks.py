import logging
from datetime import datetime
from celery.schedules import crontab
from django.db.models import Sum

from mosqlimate.celeryapp import app

from .models import TotalCases, TotalCases100kHab
from .home.vis_charts import (
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
}


@app.task
def update_total_cases_task():
    """
    Updates TotalCases for the current year
    """
    diseases = ["dengue", "chik", "zika"]

    for disease in diseases:
        for uf in uf_ibge_mapping:
            update_total_cases(disease, uf, False)


@app.task
def update_total_cases_100k_hab_task():
    """
    Updates TotalCases100kHab for the current year
    """
    diseases = ["dengue", "chik", "zika"]

    for disease in diseases:
        for uf in uf_ibge_mapping:
            update_total_cases(disease, uf, True)


def update_total_cases(disease: str, uf: str, is_100k_hab: bool):
    """
    Recalculate HistoricoAlerta total cases and total cases by 100k hab,
    updating the values for the current year
    """
    year = datetime.now().year

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

    data = historico_alerta_data_for(disease)
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
