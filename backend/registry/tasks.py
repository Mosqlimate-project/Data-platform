import logging
from dateutil.relativedelta import relativedelta
from typing import Optional

from django.core.cache import cache
from django.db.models import Subquery, OuterRef, Max, Q
from django.utils import timezone

from mosqlimate.celeryapp import app

from registry.models import QuantitativePrediction
from vis.utils import calculate_score


@app.task
def update_prediction_scores(prediction_ids: Optional[list[int]] = None):
    year_ago = timezone.now().date() - relativedelta(years=1)

    latest = (
        QuantitativePrediction.objects.filter(id=OuterRef("id"))
        .annotate(max_date=Max("data__date"))
        .values("max_date")
    )

    q = QuantitativePrediction.objects.annotate(end_date=Subquery(latest))

    empty_scores = Q(
        mae_score__isnull=True,
        mse_score__isnull=True,
        crps_score__isnull=True,
        log_score__isnull=True,
        interval_score__isnull=True,
        wis_score__isnull=True,
    )

    filters = Q(end_date__gte=year_ago) | empty_scores

    if not prediction_ids:
        predictions = q.filter(filters)
    else:
        predictions = q.filter(Q(id__in=prediction_ids) & filters)

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
