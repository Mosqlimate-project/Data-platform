import random

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache

from registry.models import Prediction, Model, Tag
from vis.dash.line_chart import calculate_score


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


@receiver(pre_save, sender=Prediction)
def calculate_score_add_color(sender, instance, **kwargs):
    def random_hex_color():
        r = random.randint(0, 255)
        g = random.randint(0, 255)
        b = random.randint(0, 255)
        return "#{:02x}{:02x}{:02x}".format(r, g, b)

    if instance.color == "#000000":
        instance.color = random_hex_color()
        instance.save()

    scores = calculate_score(instance)

    if scores != instance.scores:
        # cache.delete("get_predictions")
        cache.clear()  # TODO: should delete specific caches

    instance.mae = scores["mae"]
    instance.mse = scores["mse"]
    instance.crps = scores["crps"]
    instance.log_score = scores["log_score"]
    instance.interval_score = scores["interval_score"]


@receiver(post_save, sender=Prediction)
@receiver(post_delete, sender=Prediction)
@receiver(post_save, sender=Model)
@receiver(post_delete, sender=Model)
def clear_model_cache(sender, **kwargs):
    # cache.delete("get_models")
    # cache.delete("get_predictions")
    cache.clear()  # TODO: should delete specific caches
