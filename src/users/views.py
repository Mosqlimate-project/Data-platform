from django.http import Http404
from django.shortcuts import redirect, render
from django.contrib.auth import logout, get_user_model
from allauth.account.decorators import verified_email_required

User = get_user_model()


def profile(request, username: str):
    if request.method == "POST":
        pass
    user = User.objects.filter(username=username).first()
    if user:
        return render(request, "users/profile.html", {})
    else:
        raise Http404


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
