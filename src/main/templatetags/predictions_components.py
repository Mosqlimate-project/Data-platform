from django import template

from registry.models import Prediction

register = template.Library()


@register.inclusion_tag("main/components/predictions-list.html", takes_context=False)
def predictions_list(predictions: list[Prediction]):
    return {"predictions": predictions}
