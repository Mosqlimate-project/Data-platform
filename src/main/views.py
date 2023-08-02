from django.contrib import messages
from django.shortcuts import render, reverse

from registry.api import list_predictions
from registry.pagination import PredictionsPagination
from registry.schema import PredictionFilterSchema


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


def predictions(request):
    def store_session(**params) -> None:
        for param in params:
            value = params.get(param)
            if value:
                request.session[param] = value
            else:
                request.session[param] = None

    predicts_params = [
        "page",
        "per_page",
        "id",
        "model_id",
        "model_name",
        "author_name",
        "author_username",
        "author_institution",
        "repository",
        "implementation_language",
        "type",
        "commit",
        "predict_date",
        "predict_after_than",
        "predict_before_than",
    ]

    def get_filters() -> tuple[PredictionFilterSchema, PredictionsPagination.Input]:
        """Gets parameters from request"""
        filters = PredictionFilterSchema()
        pagination = PredictionsPagination.Input(
            page=int(request.session.get("page") or 1),
            per_page=int(request.session.get("per_page") or 50),
        )

        for param in predicts_params:
            value = request.GET.get(param)
            if value:
                if param in ["page", "per_page"]:
                    setattr(pagination, param, int(value))
                else:
                    setattr(filters, param, value)
                    store_session(**{param: value})

        return filters, pagination

    def build_url_path(params) -> str:
        return "&".join(
            [
                f"{p}={v}"
                for p, v in params
                if v and p not in ["predictions", "total_predictions", "total_pages"]
            ]
        )

    filters, pagination = get_filters()

    # API request
    response = list_predictions(request, filters=filters, ninja_pagination=pagination)

    api_url = request.build_absolute_uri(reverse("api-1:list_predictions")) + "?"
    api_url += build_url_path(response["pagination"].items())
    api_url += build_url_path(filters.__dict__.items())

    context = {}
    if response["items"]:
        context["predictions"] = response["items"]
    context["pagination"] = response["pagination"]
    store_session(**response["pagination"])
    context["api_url"] = api_url

    if response["message"]:
        messages.warning(request, message=response["message"])

    return render(request, "main/predictions.html", context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
