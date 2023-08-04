from allauth.account.decorators import verified_email_required
from django.contrib import messages
from django.contrib.auth import get_user_model, logout
from django.shortcuts import get_object_or_404, redirect, render
from django.views import View

from registry.models import Author, Model, Prediction

from .api import update_model
from .forms import UpdateAuthorForm, UpdateModelForm

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

        elif "update_model" in request.POST:
            form = UpdateModelForm(request.POST)
            if form.is_valid():
                model_id = form.cleaned_data["model_id"]

                repository = form.cleaned_data["model_repository"]

                if not any(
                    str(repository).startswith(p)
                    for p in ["https://github.com/", "github.com/"]
                ):
                    repository = f"https://github.com/{repository}/"

                payload = {
                    "name": form.cleaned_data["model_name"],
                    "description": form.cleaned_data["model_description"],
                    "repository": repository,
                    "implementation_language": form.cleaned_data["model_language"],
                    "type": form.cleaned_data["model_type"],
                }

                status_code, model = update_model(
                    request=request,
                    model_id=model_id,
                    payload=payload,
                )

                if status_code == 201:
                    messages.success(request, "Model updated successfully")
                elif status_code == 401:
                    messages.error(request, "Unauthorized")
                else:
                    messages.error(
                        request,
                        f"Failed to update model: {status_code}",
                    )
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
