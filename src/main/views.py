from typing import Optional

from django.contrib import messages
from django.shortcuts import render
import requests


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
            # Stores params from request
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
        """Gets parameters from request"""
        params = {}
        for param in parameters:
            value = request.GET.get(param)
            if param in ["page", "per_page"]:
                params[param] = request.session.get(param)
            if value:
                params[param] = value
        return params

    store_session(request_params=predicts_params)

    base_api_url = (
        f"{('https' if request.is_secure() else 'http')}://{request.get_host()}"
        f"/api/registry/predictions/?"
    )

    # Parameters passed in request
    params = get_params(pagination_params + predicts_params)
    print(f"PARAMS ---------------------------> {params}")

    # API request
    response = requests.get(base_api_url, params=params)
    api_url_path = "&".join([f"{p}={v}" for p, v in params.items()])

    print(f"API_URL ---------------------------> {base_api_url}")
    context = {}
    if response.status_code == 200:
        data = response.json()
        context["predictions"] = data["items"]
        context["pagination"] = data["pagination"]
        context["api_url"] = (
            "https://api.mosqlimate.org/api/registry/predictions/?" + api_url_path
        )

        store_session(params_in=context["pagination"])

        if data["message"]:
            context["message"] = data["message"]
            messages.warning(request, message=data["message"])

    elif response.status_code == 422:
        message = "Bad API request"
        context["message"] = message
        messages.error(request, message=message)

    else:
        pass

    return render(request, "main/predictions.html", context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
