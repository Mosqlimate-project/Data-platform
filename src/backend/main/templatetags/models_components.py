from django import template

from registry.models import Model, ImplementationLanguage

register = template.Library()


@register.inclusion_tag("main/components/models-list.html", takes_context=True)
def models_list(context, models: list[Model]):
    user = context.request.user
    languages = ImplementationLanguage.objects.all()

    tags = list(
        set(
            filter(
                lambda x: x != "", context.request.GET.getlist("tags", None)
            )
        )
    )

    context = {
        "user": user,
        "models": models,
        "implementation_languages": languages,
        "selected_tags": tags,
    }
    return context
