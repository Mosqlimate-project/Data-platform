import os
from django import template

from registry.models import Prediction

register = template.Library()


@register.inclusion_tag("main/components/predictions-box.html", takes_context=False)
def predictions_box(predictions: list[Prediction]):
    return {"predictions": predictions}


@register.filter
def static_file_exists(file_path):
    # TODO: find a better way to search for static files
    return os.path.isfile(os.path.join("static", file_path))
