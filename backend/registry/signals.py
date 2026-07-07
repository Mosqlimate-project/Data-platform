from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone

from registry.models import (
    ModelPrediction,
    QuantitativePrediction,
    RepositoryModel,
)


@receiver(post_save, sender=ModelPrediction)
def update_model_timestamp_on_prediction(sender, instance, created, **kwargs):
    if created and instance.model:
        RepositoryModel.objects.filter(pk=instance.model.pk).update(
            updated=timezone.now()
        )


@receiver(post_save, sender=QuantitativePrediction)
def trigger_score_update_on_creation(sender, instance, created, **kwargs):
    if created:
        if instance.model:
            RepositoryModel.objects.filter(pk=instance.model.pk).update(
                updated=timezone.now()
            )

        from registry.tasks import update_prediction_scores

        transaction.on_commit(
            lambda: update_prediction_scores.delay([instance.id])
        )
