from django import template
from django.db.models import Max
from vis.plots.home.vis_charts import (
    national_total_cases_data,
)
from vis.models import TotalCases


register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=True)
def vis_echarts(context):
    cases_data = {}
    diseases = ["dengue", "chikungunya", "zika"]
    for disease in diseases:
        cases_data[disease] = {}
        cases_data[disease]["last_available_year"] = TotalCases.objects.filter(
            disease=disease
        ).aggregate(last_year=Max("year"))["last_year"]

        cases_data[disease]["total_cases"], _ = national_total_cases_data(
            disease, False
        )
        cases_data[disease]["total_cases_100k"], _ = national_total_cases_data(
            disease, True
        )
    context.update({**cases_data, "diseases": diseases})
    return context
