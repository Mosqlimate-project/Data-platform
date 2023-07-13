from django import template
from registry.models import Model

register = template.Library()


@register.inclusion_tag("users/components/model.html", takes_context=False)
def model_component(model: Model):
    context = {"model_name": model.name}
    return context
