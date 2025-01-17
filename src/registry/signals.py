from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from registry.models import Prediction, Model, Tag


@receiver(post_save, sender=Model)
def include_model_tags(sender, instance, created, **kwargs):
    tags = [
        Tag.objects.get(pk=id)
        for id in Tag.get_tag_ids_from_model_id(instance.id)
    ]
    instance.tags.set(tags)


@receiver(post_save, sender=Tag)
def tags_post_save(sender, instance, created, **kwargs):
    if created and instance.color is None:
        instance.color = Tag.random_rgb()
        instance.save()


@receiver(post_save, sender=Prediction)
@receiver(post_delete, sender=Prediction)
def clear_model_cache(sender, **kwargs):
    cache_key = "views.decorators.cache.cache_page.get_models"
    cache.delete(cache_key)
