from django import template
from urllib.parse import urlparse
from registry.models import Model
from django.db.models import Count

register = template.Library()


@register.inclusion_tag("users/components/models-box.html", takes_context=True)
def models_box(context):
    models = context.get("user_models")
    models = Model.objects.annotate(predictions_count=Count("prediction"))
    context = {"models": models}
    return context


@register.filter(name="get_repo")
def extract_repo_from_github_url(repo_url: str) -> str:
    # Assumes the repository url has been checked before
    url_path = urlparse(repo_url).path
    owner, repo = url_path.split("/")[:2]
    return repo
