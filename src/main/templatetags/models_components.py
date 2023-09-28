from django import template

from registry.models import Model

register = template.Library()


@register.inclusion_tag("main/components/models-list.html", takes_context=True)
def models_list(context, models: list[Model]):
    user = context.request.user
    context = {
        "user": user,
        "models": models,
    }
    return context
