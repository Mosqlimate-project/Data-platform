from django import template
from urllib.parse import urlparse


register = template.Library()


@register.filter(name="short_repository_link")
def short_repository_link(repo: str) -> str:
    url = urlparse(repo)
    return url.path.strip("/")
