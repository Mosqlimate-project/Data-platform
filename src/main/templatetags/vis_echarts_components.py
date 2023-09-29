from django import template


register = template.Library()


@register.inclusion_tag("main/components/vis-echarts.html", takes_context=False)
def vis_echarts():
    return
