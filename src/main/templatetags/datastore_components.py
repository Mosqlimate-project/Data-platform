import datetime as dt
from django import template

from main.utils import UFs

register = template.Library()


@register.inclusion_tag("datastore/components/infodengue.html")
def infodengue():
    diseases = [
        ("dengue", "Dengue"),
        ("zika", "Zika"),
        ("chik", "Chikungunya"),
    ]

    context = {"diseases": diseases, "UFs": UFs.items()}

    return context


@register.inclusion_tag("datastore/components/climate.html")
def climate():
    context = {"UFs": UFs.items()}
    return context


@register.inclusion_tag("datastore/components/mosquito.html")
def mosquito():
    context = {}
    return context


@register.inclusion_tag("datastore/components/episcanner.html")
def episcanner():
    diseases = [
        ("dengue", "Dengue"),
        ("zika", "Zika"),
        ("chik", "Chikungunya"),
    ]

    context = {
        "diseases": diseases,
        "UFs": UFs.items(),
        "year": dt.datetime.now().year,
    }

    return context
