from django import template

from registry.models import Prediction, Model

register = template.Library()


@register.filter(name="is_prediction_visualizable")
def is_prediction_visualizable(prediction: Prediction):
    if any(prediction.visualizable()):
        return True
    return False


@register.filter(name="is_model_visualizable")
def is_model_visualizable(model: Model):
    predictions = Prediction.objects.filter(model=model)
    for prediction in predictions:
        if any(prediction.visualizable()):
            return True
    return False
