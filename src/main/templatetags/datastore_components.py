from django import template

from main.utils import UFs

register = template.Library()


@register.inclusion_tag("main/components/datastore/infodengue.html")
def infodengue():
    diseases = [
        ("dengue", "Dengue"),
        ("zika", "Zika"),
        ("chik", "Chikungunya"),
    ]

    context = {"diseases": diseases, "UFs": UFs.items()}

    return context


@register.inclusion_tag("main/components/datastore/climate.html")
def climate():
    context = {"UFs": UFs.items()}
    return context


@register.inclusion_tag("main/components/datastore/mosquito.html")
def mosquito():
    context = {}
    return context
