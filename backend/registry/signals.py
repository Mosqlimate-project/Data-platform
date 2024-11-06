from django.db.models.signals import post_save
from django.dispatch import receiver

from registry.models import Model, Tag


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
