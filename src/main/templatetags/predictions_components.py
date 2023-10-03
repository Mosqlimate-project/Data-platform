from django import template

from registry.models import Prediction

register = template.Library()


@register.inclusion_tag("main/components/predictions-list.html", takes_context=True)
def predictions_list(context, predictions: list[Prediction]):
    user = context.request.user

    context = {
        "user": user,
        "predictions": predictions,
    }
    return context
