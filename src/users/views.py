from django.shortcuts import redirect
from django.contrib.auth import logout
from allauth.account.decorators import verified_email_required


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
