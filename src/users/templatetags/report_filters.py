from django import template
from urllib import parse

register = template.Library()


@register.filter
def urllib_parse(value):
    return parse.quote_plus(value)
