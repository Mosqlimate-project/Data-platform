from django.shortcuts import render

# from django.http import HttpResponse


def home(response):
    return render(response, "mosqlimate/home.html", {})
