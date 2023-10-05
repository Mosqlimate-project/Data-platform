from django import template
from datastore.vis_charts import get_data

register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    br_data, current_year = get_data()

    # Ordenar a lista br_data pelo valor em ordem decrescente
    br_data.sort(key=lambda x: x["value"], reverse=True)

    context["min_total_cases"] = min(item["value"] for item in br_data)
    context["max_total_cases"] = max(item["value"] for item in br_data)
    context["br_data"] = br_data

    context["current_year"] = f"{current_year}"

    return context
