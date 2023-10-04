from django import template
from datastore.vis_charts import get_data

register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    br_data = get_data()
    context["br_data"] = br_data

    return context
