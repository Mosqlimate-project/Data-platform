from allauth.account.decorators import verified_email_required
from django.contrib import messages
from django.contrib.auth import get_user_model, logout
from django.middleware import csrf
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views import View
import requests

from registry.models import Author, Model, Prediction

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

                payload = {
                    "model_name": form.cleaned_data["model_name"],
                    "model_description": form.cleaned_data["model_description"],
                    "model_repository": form.cleaned_data["model_repository"],
                    "model_language": form.cleaned_data["model_language"],
                    "model_type": form.cleaned_data["model_type"],
                }

                response = self.update_model_api_call(request, model_id, payload)

                if response.status_code == 200:
                    messages.success(request, "Model updated successfully")
                elif response.status_code == 401:
                    messages.error(request, "Unauthorized")
                else:
                    print(response.__dict__)
                    messages.error(
                        request,
                        f"Failed to update model: {response.json().get('message')}",
                    )
            else:
                messages.error(request, form.errors.values[0].as_data())

        return redirect("profile", username=username)

    def update_model_api_call(self, request, model_id, payload):
        api_url = request.build_absolute_uri(
            reverse("api-1:update_model", kwargs={"model_id": model_id})
        )
        # csrf_token = request.COOKIES.get("csrftoken")
        csrf_token = csrf.get_token(request)
        headers = {"X-CSRFToken": csrf_token}
        print(headers)
        response = requests.put(api_url, json=payload, headers=headers)
        return response


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
