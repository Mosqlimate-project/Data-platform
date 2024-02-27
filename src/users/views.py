import os
from pathlib import Path

from allauth.account.decorators import verified_email_required
from django.contrib.auth import get_user_model, logout
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext as _
from django.views import View
from django.contrib import messages
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest

from registry.models import Author, Model, Prediction
from .forms import UpdateAuthorForm, UploadGeopackageFileForm

User = get_user_model()


class UploadGeopackageToPostGISView(View):
    template_name = "users/upload_geopackage.html"

    def get(self, request):
        if not (request.user.is_authenticated and request.user.is_superuser):
            return redirect("home")

        form = UploadGeopackageFileForm()
        return render(request, self.template_name, {"form": form})

    def post(self, request):
        if not (request.user.is_authenticated and request.user.is_superuser):
            return redirect("home")

        form = UploadGeopackageFileForm(request.POST, request.FILES)
        if form.is_valid():
            # form.save()
            messages.success(request, "File uploaded successfully")
            return redirect("upload_geopackage")
        else:
            messages.error(request, "Failed to upload file")
            self.get(request)


class UploadTempFileView(View):
    def get(self, request):
        if not (request.user.is_authenticated and request.user.is_superuser):
            return HttpResponseBadRequest("Unauthorized")

    def post(self, request):
        if not (request.user.is_authenticated and request.user.is_superuser):
            return HttpResponseBadRequest("Unauthorized")

        file = request.FILES.get("file")

        if file:
            file_path = Path(
                os.path.join(settings.MEDIA_ROOT, "tmp", file.name)
            )

            if not file_path.parent.exists():
                file_path.parent.mkdir(parents=True)

            if file_path.exists():
                file_path.unlink()

            file_path.touch()

            with open(file_path, "wb") as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            return HttpResponse(file_path.absolute())
        else:
            return HttpResponseBadRequest("No file provided")


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


def redirect_to_user_profile(request):
    username = request.user.username
    return redirect(f"/{username}/")


@verified_email_required
def logout_github(request):
    logout(request)
    return redirect("home")
