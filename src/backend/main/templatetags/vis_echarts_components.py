from django import template
from vis.plots.home.vis_charts import (
    national_total_cases_data,
    get_last_available_year,
)


register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    default_uf = "RJ"

    disease_name = ["dengue", "chikungunya", "zika"]

    br_info_data = {}

    for disease in disease_name:
        last_available_year = get_last_available_year(default_uf, disease)
        br_info_data[f"br_data_{disease}"], _ = national_total_cases_data(
            disease, False
        )
        br_info_data[f"br_data_{disease}_100k"], _ = national_total_cases_data(
            disease, True
        )

    br_info_data.update(
        {
            "last_available_year": f"{last_available_year}",
            "disease_name": disease_name,
        }
    )

    from pprint import pprint

    pprint(br_info_data)
    context.update(br_info_data)

    return context
