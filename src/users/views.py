from allauth.account.decorators import verified_email_required
from django.contrib.auth import get_user_model, logout
from django.http import Http404
from django.shortcuts import redirect, render

from registry.models import Author, Model, Prediction
from .forms import UpdateUserForm

User = get_user_model()


def profile(request, username: str):
    if request.method == "POST":
        # TODO: add User specific operations here, as changing user's name API call
        pass
    user = User.objects.filter(username=username).first()
    author = Author.objects.get(user=user)
    models = Model.objects.filter(author=author)
    predictions = Prediction.objects.filter(model__author=author)
    avatar_url = user.socialaccount_set.first().get_avatar_url()

    if user:
        return render(
            request,
            "users/profile.html",
            {
                "user_profile": user,
                "user_author": author,
                "user_models": models,
                "user_predictions": predictions,
                "user_avatar": avatar_url,
            },
        )
    else:
        raise Http404


def update_author(request):
    author = Author.objects.get(user=request.user)

    if request.method == "POST":
        form = UpdateUserForm(request.POST)
        if form.is_valid():
            request.user.first_name = form.cleaned_data["first_name"]
            request.user.last_name = form.cleaned_data["last_name"]
            author.institution = form.cleaned_data["institution"]
            request.user.save()
            author.save()
            print(request.user.first_name, request.user.last_name, author.institution)
            return redirect("profile")

    else:
        form = UpdateUserForm(
            initial={
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "institution": author.institution,
            }
        )

    return render(request, "profile.html", {"form": form})


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
