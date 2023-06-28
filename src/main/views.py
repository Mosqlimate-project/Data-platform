from django.shortcuts import redirect, render
from django.contrib.auth import logout
from allauth.account.decorators import verified_email_required


def home(response):
    return render(response, "main/home.html", {})


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
