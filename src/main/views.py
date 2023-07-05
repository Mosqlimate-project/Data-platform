from django.shortcuts import render


def home(response):
    return render(response, "main/home.html", {})


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
