from django.http import Http404
from django.shortcuts import redirect, render
from django.contrib.auth import logout, get_user_model
from allauth.account.decorators import verified_email_required

from registry.models import Author, Model, Prediction

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


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
