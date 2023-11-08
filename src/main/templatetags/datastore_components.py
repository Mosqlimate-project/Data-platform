from django import template

register = template.Library()


@register.inclusion_tag("main/components/datastore/infodengue.html", takes_context=True)
def infodengue(context):
    context = {}
    return context


@register.inclusion_tag("main/components/datastore/climate.html", takes_context=True)
def climate(context):
    context = {}
    return context


@register.inclusion_tag("main/components/datastore/mosquito.html", takes_context=True)
def mosquito(context):
    context = {}
    return context
