from allauth.account.decorators import verified_email_required
from bootstrap_modal_forms.generic import BSModalCreateView
from django.contrib.auth import get_user_model, logout
from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse_lazy

from registry.models import Author, Model, Prediction

from .forms import UserModelForm

User = get_user_model()


class UserUpdateView(BSModalCreateView):
    template_name = "users/components/update-user.html"
    form_class = UserModelForm
    success_message = "Success: User updated."
    success_url = reverse_lazy("profile")


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
