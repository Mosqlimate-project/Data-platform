from django import template

from registry.models import Model, ImplementationLanguage

register = template.Library()


@register.inclusion_tag("main/components/models-list.html", takes_context=True)
def models_list(context, models: list[Model]):
    user = context.request.user
    languages = ImplementationLanguage.objects.all()

    context = {
        "user": user,
        "models": models,
        "implementation_languages": languages,
    }
    return context
