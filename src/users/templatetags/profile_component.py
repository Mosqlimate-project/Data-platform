from django import template
from urllib.parse import urlparse
from registry.models import Model
from django.db.models import Count

# from django.core.paginator import Paginator

register = template.Library()


@register.inclusion_tag("users/components/models-box.html", takes_context=True)
def models_box(context):
    profile = context.get("user_profile")
    models = context.get("user_models")
    models = Model.objects.annotate(predictions_count=Count("prediction"))
    context = {
        "user": context.request.user,
        "user_profile": profile,
        "models": models,
    }
    return context


# @register.inclusion_tag("users/components/predictions-box.html", takes_context=True)
# def predictions_box(context):
#     profile = context.get("user_profile")
#     predictions = context.get("user_predictions")
#     paginator = Paginator(predictions, 10)
#     search_query = context["request"].GET.get("q")
#
#     if search_query:
#         predictions = predictions.filter(model__name__icontains=search_query)
#
#     page_number = context["request"].GET.get("page")
#
#     try:
#         predictions_page = paginator.page(page_number)
#     except Exception:
#         predictions_page = paginator.page(1)
#
#     context = {
#         "user": context["request"].user,
#         "user_profile": profile,
#         "predictions": predictions_page,
#         "search_query": search_query,
#     }
#     return context


@register.filter(name="get_repo")
def extract_repo_from_github_url(repo_url: str) -> str:
    # Assumes the repository url has been checked before
    url_path = urlparse(repo_url).path
    owner, repo = url_path.split("/")[:2]
    return repo
