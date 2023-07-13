from django import template

register = template.Library()


@register.inclusion_tag("users/components/models-box.html", takes_context=True)
def models_box(context):
    models = context.get("user_models")
    context = {"models": models}
    return context
