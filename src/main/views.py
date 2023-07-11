from django.shortcuts import render


def home(response):
    return render(response, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
