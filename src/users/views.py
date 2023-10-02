from allauth.account.decorators import verified_email_required
from django.contrib import messages
from django.contrib.auth import get_user_model, logout
from django.shortcuts import get_object_or_404, redirect, render
from django.views import View

from registry.models import Author, Model, Prediction
from .forms import UpdateAuthorForm

User = get_user_model()


class ProfileView(View):
    template_name = "users/profile.html"

    def get_context_data(self, username):
        user = get_object_or_404(User, username=username)
        author = get_object_or_404(Author, user=user)
        models = Model.objects.filter(author=author)
        predictions = Prediction.objects.filter(model__author=author)
        avatar_url = user.socialaccount_set.first().get_avatar_url()
        context = {
            "user_profile": user,
            "user_author": author,
            "user_models": models,
            "user_predictions": predictions,
            "user_avatar": avatar_url,
        }
        return context

    def get(self, request, username):
        context = self.get_context_data(username)
        return render(request, self.template_name, context)

    def post(self, request, username):
        context = self.get_context_data(username)

        if "update_author" in request.POST:
            form = UpdateAuthorForm(request.POST)
            if form.is_valid():
                user = context["user_profile"]
                author = context["user_author"]
                user.first_name = form.cleaned_data["first_name"]
                user.last_name = form.cleaned_data["last_name"]
                user.save()

                author.institution = form.cleaned_data["institution"]
                author.save()

                messages.success(request, "Author updated successfully")
            else:
                messages.error(request, "Invalid request")
        else:
            messages.error(
                request, "Form error"
            )  # TODO: Find a way to retrieve form errors

        return redirect("profile", username=username)


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
