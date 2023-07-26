from django import template

register = template.Library()


@register.filter(name="def_limit")
def default_prediction_query_limit(limit) -> int:
    if not limit:
        return 100
    return int(limit)


@register.filter(name="def_offset")
def default_prediction_query_offset(offset) -> int:
    if not offset:
        return 0
    return int(offset)
