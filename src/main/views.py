from django.shortcuts import render
import requests


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


def predictions(request):
    limit = request.GET.get("limit") or 100
    offset = request.GET.get("offset") or 0

    base_url = (
        f"http://0.0.0.0:8042/api/registry/predictions/?limit={limit}&offset={offset}"
    )

    params = {
        "id": request.GET.get("id"),
        "model_id": request.GET.get("model_id"),
        "model_name": request.GET.get("model_name"),
        "author_name": request.GET.get("author_name"),
        "author_username": request.GET.get("author_username"),
        "author_institution": request.GET.get("author_institution"),
        "repository": request.GET.get("repository"),
        "implementation_language": request.GET.get("implementation_language"),
        "type": request.GET.get("type"),
        "commit": request.GET.get("commit"),
        "predict_date": request.GET.get("predict_date"),
        "predict_after_than": request.GET.get("predict_after_than"),
        "predict_before_than": request.GET.get("predict_before_than"),
        "predict_between": request.GET.get("predict_between"),
    }

    params = {key: value for key, value in params.items() if value is not None}
    print(params)

    response = requests.get(base_url, params=params)

    if response.status_code == 200:
        data = response.json()
        predictions = data["items"]
        count = data["count"]
    else:
        predictions = []  # TODO: add "no predictions found" template here
        count = None

    return render(
        request, "main/predictions.html", {"predictions": predictions, "count": count}
    )


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
