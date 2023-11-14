from datetime import datetime

from django import template
from vis.home.vis_charts import national_total_cases_data

register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    current_year = datetime.now().year
    dengue, _ = national_total_cases_data("dengue", current_year)
    chik, _ = national_total_cases_data("chik", current_year)
    zika, _ = national_total_cases_data("zika", current_year)
    dengue_100k, _ = national_total_cases_data("dengue", current_year, True)
    chik_100k, _ = national_total_cases_data("chik", current_year, True)
    zika_100k, _ = national_total_cases_data("zika", current_year, True)

    context["br_data_dengue"] = dengue
    context["br_data_chik"] = chik
    context["br_data_zika"] = zika
    context["br_data_dengue_100k"] = dengue_100k
    context["br_data_chik_100k"] = chik_100k
    context["br_data_zika_100k"] = zika_100k

    context["current_year"] = f"{current_year}"

    return context
