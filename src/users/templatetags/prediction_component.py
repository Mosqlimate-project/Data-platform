from django import template
from registry.models import Prediction

register = template.Library()


@register.inclusion_tag("users/components/prediction-item.html", takes_context=False)
def prediction_item(prediction: Prediction):
    context = {"prediction": prediction}
    return context
