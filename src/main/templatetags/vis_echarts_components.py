from django import template
from vis.models import TotalCases


register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    available_years = list(
        TotalCases.objects.distinct("year").values_list("year", flat=True)
    )
    diseases = ["dengue", "chikungunya", "zika"]
    context.update({"years": available_years, "diseases": diseases})
    return context
