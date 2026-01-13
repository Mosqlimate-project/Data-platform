import logging
from typing import Optional

from celery.schedules import crontab
from celery.signals import worker_ready
from django.core.cache import cache

from mosqlimate.celeryapp import app

from registry.models import QuantitativePrediction
from vis.utils import calculate_score

app.conf.beat_schedule = {
    "update-prediction-scores-daily": {
        "task": "vis.tasks.update_prediction_scores",
        "schedule": crontab(hour=3, minute=0),
    },
}


@app.task
def update_prediction_scores(prediction_ids: Optional[list[int]] = None):
    if not prediction_ids:
        predictions = QuantitativePrediction.objects.all()
    else:
        predictions = QuantitativePrediction.objects.filter(
            id__in=prediction_ids
        )

    for prediction in predictions:
        try:
            scores = calculate_score(prediction.id)
        except Exception as e:
            logging.error(e)
            continue

        if scores != prediction.scores:
            cache.clear()
            prediction.mae_score = scores["mae"]
            prediction.mse_score = scores["mse"]
            prediction.crps_score = scores["crps"]
            prediction.log_score = scores["log_score"]
            prediction.interval_score = scores["interval_score"]
            prediction.wis_score = scores["wis"]
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
