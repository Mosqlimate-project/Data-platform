import os
from django import template


register = template.Library()


@register.filter
def static_file_exists(file_path):
    # TODO: find a better way to search for static files
    return os.path.isfile(os.path.join("static", file_path))
