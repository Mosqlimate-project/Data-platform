from allauth.account.decorators import verified_email_required
from django.contrib.auth import get_user_model, logout
from django.contrib import messages
from django.shortcuts import redirect, render

from registry.models import Author, Model, Prediction
from .forms import UpdateAuthorForm

User = get_user_model()


def profile(request, username: str):
    user = User.objects.filter(username=username).first()
    author = Author.objects.get(user=user)
    models = Model.objects.filter(author=author)
    predictions = Prediction.objects.filter(model__author=author)
    avatar_url = user.socialaccount_set.first().get_avatar_url()

    if request.method == "POST":
        form = UpdateAuthorForm(request.POST)
        if form.is_valid():
            request.user.first_name = form.cleaned_data["first_name"]
            request.user.last_name = form.cleaned_data["last_name"]
            request.user.save()

            author.institution = form.cleaned_data["institution"]
            author.save()

            messages.success(request, "Author updated successfully.")

            return redirect("profile", username=username)

    else:
        form = UpdateAuthorForm(
            initial={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "institution": author.institution,
            }
        )

    return render(
        request,
        "users/profile.html",
        {
            "user_profile": user,
            "user_author": author,
            "user_models": models,
            "user_predictions": predictions,
            "user_avatar": avatar_url,
            "form": form,
        },
    )


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
