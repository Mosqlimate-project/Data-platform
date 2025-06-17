from typing import Literal

from allauth.account.decorators import verified_email_required
from django.contrib import messages
from django.contrib.auth import get_user_model, logout
from django.shortcuts import get_object_or_404, redirect, render, reverse
from django.utils.translation import gettext as _
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

                messages.success(request, _("Author updated successfully"))
            else:
                messages.error(request, _("Invalid request"))
        else:
            messages.error(
                request, "Form error"
            )  # TODO: Find a way to retrieve form errors

        return redirect("profile", username=username)


class APIReportView(View):
    template_name = "users/report/api.html"

    def get(self, request, app: Literal["registry", "datastore"]):
        if app not in ["datastore", "registry"]:
            return redirect("api_report", app="datastore")

        endpoints = []

        if app == "datastore":
            endpoints = [
                "infodengue",
                "climate",
                "climate/weekly",
                "mosquito",
                "episcanner",
            ]

        endpoint = request.GET.get("endpoint")
        if not endpoint and endpoints:
            return redirect(
                f"{reverse('api_report', kwargs={'app': app})}"
                + f"?endpoint={endpoints[0]}"
            )

        context = {
            "app": app,
            "endpoints": endpoints,
            "endpoint": endpoint,
        }

        return render(request, self.template_name, context)


def redirect_to_user_profile(request):
    next_page = request.GET.get("next")
    if next_page:
        return redirect(next_page)
    else:
        username = request.user.username
        return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
