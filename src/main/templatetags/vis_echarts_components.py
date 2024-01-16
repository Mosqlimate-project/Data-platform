from django import template
from vis.home.vis_charts import (
    national_total_cases_data,
    get_last_available_year,
)


register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    default_uf = "RJ"
    default_disease = "dengue"

    disease_name = ["dengue", "chik", "zika"]

    br_info_data = {}

    for disease in disease_name:
        if disease == default_disease:
            last_available_year = get_last_available_year(default_uf, disease)
        br_info_data[f"br_data_{disease}"], _ = national_total_cases_data(
            disease, last_available_year
        )
        br_info_data[f"br_data_{disease}_100k"], _ = national_total_cases_data(
            disease, last_available_year, True
        )

    br_info_data.update(
        {
            "last_available_year": f"{last_available_year}",
            "disease_name": disease_name,
        }
    )

    context.update(br_info_data)

    return context
