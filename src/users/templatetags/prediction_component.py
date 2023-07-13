from django import template
from registry.models import Prediction

register = template.Library()


@register.inclusion_tag("users/components/prediction.html", takes_context=False)
def prediction_component(prediction: Prediction):
    context = {"predict_date": prediction.predict_date}
    return context
