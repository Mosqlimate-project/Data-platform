import json

from django.utils.translation import gettext as _
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


@register.simple_tag
def get_adm_level_name(dashboard: str, adm_level: int):
    adm_levels = {
        0: _("National"),
        1: _("State"),
        2: _("Municipality"),
        3: _("Sub Municipality"),
    }
    adm_levels_fore_maps = {
        0: _("National"),
        1: _("Macroregion"),
        2: _("State"),
        3: _("Macro Health"),
    }
    return (
        adm_levels_fore_maps[adm_level]
        if dashboard == "Forecast Map"
        else adm_levels[adm_level]
    )


@register.filter(name="parse_nones")
def nones_to_null(value):
    return json.dumps(value).replace("None", "null")
