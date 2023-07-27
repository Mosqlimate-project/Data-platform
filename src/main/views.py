from django.shortcuts import render
import requests
from typing import Optional


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


def predictions(request):
    pagination_params = [
        "predictions",
        "total_predictions",
        "page",
        "total_pages",
        "per_page",
    ]

    predicts_params = [
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

    def store_session(
        request_params: Optional[list[str]] = None, params_in: Optional[dict] = None
    ) -> None:
        """Stores parameters in the session"""
        if request_params:
            # Pass params from request
            for param in request_params:
                value = request.GET.get(param)
                if value:
                    request.session[param] = value
                else:
                    request.session[param] = None

        if params_in:
            # Pass parameters to session
            for param, value in params_in.items():
                if value:
                    request.session[param] = value
                else:
                    request.session[param] = None

    def get_params(parameters: list[str]) -> dict:
        params = {}
        for param in parameters:
            value = request.GET.get(param)
            if param in ["page", "per_page"]:
                params[param] = request.session.get(param)
            if value:
                params[param] = value
        return params

    store_session(request_params=predicts_params)

    page = request.GET.get("page") or 1
    per_page = request.GET.get("per_page") or 50

    base_url = (
        f"http://0.0.0.0:8042/api/registry/predictions/?page={page}&per_page={per_page}"
    )

    params = get_params(pagination_params + predicts_params)

    response = requests.get(base_url, params=params)
    api_url = "&".join([f"{p}={v}" for p, v in params.items()])

    context = {}
    if response.status_code == 200:
        data = response.json()
        context["predictions"] = data["items"]
        context["pagination"] = data["pagination"]
        context["message"] = data["message"]
        context["api_url"] = "https://api.mosqlimate.org/?" + api_url

        store_session(params_in=context["pagination"])

    else:
        # TODO: add "no predictions found" template here
        pass

    return render(request, "main/predictions.html", context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
