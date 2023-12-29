from django.shortcuts import get_object_or_404
from django import template

from registry.models import Prediction, Model

register = template.Library()


@register.filter(name="model_name_by_id")
def get_model_name_by_id(id: int) -> str:
    model = get_object_or_404(Model, pk=id)
    return model.name


@register.filter(name="prediction_description_by_id")
def get_prediction_description_by_id(id: int) -> str:
    prediction = get_object_or_404(Prediction, pk=id)
    return prediction.description


@register.filter(name="is_prediction_visualizable")
def is_prediction_visualizable(prediction: Prediction):
    if prediction.visualizable:
        return True
    return False


@register.filter(name="is_model_visualizable")
def is_model_visualizable(model: Model):
    predictions = Prediction.objects.filter(model=model)
    for prediction in predictions:
        if prediction.visualizable:
            return True
    return False


@register.filter(name="is_empty")
def is_empty(iter):
    if not iter or iter is None:
        return True
    if iter:
        return False
