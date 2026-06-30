import logging
from dateutil.relativedelta import relativedelta
from typing import Optional

from django.core.cache import cache
from django.db.models import Min
from django.utils import timezone

from mosqlimate.celeryapp import app

from registry.models import QuantitativePrediction
from vis.utils import calculate_score


@app.task
def update_prediction_scores(prediction_ids: Optional[list[int]] = None):
    six_months_ago = timezone.now().date() - relativedelta(months=6)

    if not prediction_ids:
        predictions = QuantitativePrediction.objects.annotate(
            start_date=Min("data__date")
        ).filter(start_date__gte=six_months_ago)
    else:
        predictions = QuantitativePrediction.objects.annotate(
            start_date=Min("data__date")
        ).filter(id__in=prediction_ids, start_date__gte=six_months_ago)

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
