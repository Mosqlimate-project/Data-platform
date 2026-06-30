from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

from registry.models import QuantitativePrediction


@receiver(post_save, sender=QuantitativePrediction)
def trigger_score_update_on_creation(sender, instance, created, **kwargs):
    if created:
        from registry.tasks import update_prediction_scores

        transaction.on_commit(
            lambda: update_prediction_scores.delay([instance.id])
        )
