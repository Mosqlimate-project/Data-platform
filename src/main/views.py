from django.shortcuts import render
import requests


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


def predictions(request):
    page = request.GET.get("page") or 1
    per_page = request.GET.get("per_page") or 50

    base_url = (
        f"http://0.0.0.0:8042/api/registry/predictions/?page={page}&per_page={per_page}"
    )

    params = {"page": page, "per_page": per_page}

    def include_params(parameters: list[str]) -> None:
        for param in parameters:
            value = request.GET.get(param)
            if value:
                params[param] = value

    include_params(
        [
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
            "predict_between",
        ]
    )

    response = requests.get(base_url, params=params)
    api_url = "&".join([f"{p}={v}" for p, v in params.items()])

    context = {}
    if response.status_code == 200:
        data = response.json()
        context["predictions"] = data["items"]
        context["pagination"] = data["pagination"]
        context["message"] = data["message"]
        context["api_url"] = "https://api.mosqlimate.org/?" + api_url
    else:
        # TODO: add "no predictions found" template here
        pass

    return render(request, "main/predictions.html", context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
