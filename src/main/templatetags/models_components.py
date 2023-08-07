from django import template

from registry.models import Model

register = template.Library()


@register.inclusion_tag("main/components/models-list.html", takes_context=False)
def models_list(models: list[Model]):
    return {"models": models}
