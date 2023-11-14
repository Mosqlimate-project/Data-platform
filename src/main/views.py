from django.contrib import messages
from django.shortcuts import render, reverse, redirect, get_object_or_404
from django.utils.translation import gettext as _
from django.db.models import Count
from django.views import View

from users.forms import (
    UpdateModelForm,
    DeleteModelForm,
    UpdatePredictionForm,
    DeletePredictionForm,
)
from registry.api import (
    list_models,
    list_predictions,
    update_model,
    delete_model,
    update_prediction,
    delete_prediction,
)
from registry.pagination import PagesPagination
from registry.schema import ModelFilterSchema, PredictionFilterSchema
from registry.models import Model, Prediction, ImplementationLanguage


# -- Utils --
def build_url_path(params) -> str:
    return "&".join(
        [
            f"{p}={v}"
            for p, v in params
            if v and p not in ["items", "total_items", "total_pages"]
        ]
    )


# --


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return redirect("http://0.0.0.0:8043/", code=302)


class ModelsView(View):
    template_name = "main/models.html"

    def get(self, request):
        get = request.GET.get

        def store_session(**params) -> None:
            """Stores parameters in session"""
            for param in params:
                value = params.get(param)
                if value:
                    request.session[param] = value
                else:
                    request.session[param] = None

        # Parameters that come in the request
        predicts_params = {
            "page": get("page", 1),
            "per_page": get("per_page", 50),
            "id": get("id", ""),
            "name": get("name", ""),
            "author_name": get("author_name", ""),
            "author_username": get("author_username", ""),
            "author_institution": get("author_institution", ""),
            "repository": get("repository", ""),
            "implementation_language": get("implementation_language", ""),
            "type": get("type", ""),
        }

        def get_filters() -> tuple[ModelFilterSchema, PagesPagination.Input]:
            """Gets parameters from request"""
            filters = ModelFilterSchema()
            pagination = PagesPagination.Input(
                page=int(request.session.get("page") or 1),
                per_page=int(request.session.get("per_page") or 50),
            )

            for param, value in predicts_params.items():
                store_session(**{param: value})
                if value:
                    if param in ["page", "per_page"]:
                        setattr(pagination, param, int(value))
                    else:
                        setattr(filters, param, value)

            return filters, pagination

        # Request from user
        filters, pagination = get_filters()

        # API request
        response = list_models(
            request, filters=filters, ninja_pagination=pagination
        )

        context = {}

        # Build equivalent API url
        api_url = (
            request.build_absolute_uri(reverse("api-1:list_models")) + "?"
        )
        api_url += build_url_path(response["pagination"].items())
        api_url += "&" + build_url_path(filters.__dict__.items())
        context["api_url"] = api_url

        context["pagination"] = response["pagination"]

        languages_refs = ImplementationLanguage.objects.annotate(
            ref_count=Count("model")
        ).filter(ref_count__gt=0)

        langs = languages_refs.values_list("language", flat=True)
        context["implementation_languages_with_refs"] = list(langs)

        if response["items"]:
            context["models"] = response["items"]

        if response["message"]:
            messages.warning(request, message=response["message"])

        return render(request, self.template_name, context)


class EditModelView(View):
    template_name = "main/edit-model.html"

    def get(self, request, model_id: int):
        model = get_object_or_404(Model, pk=model_id)

        if request.user != model.author.user:
            return redirect("models")

        languages = ImplementationLanguage.objects.all()

        context = {
            "model": model,
            "implementation_languages": languages,
            "adm_levels": [
                (0, _("National")),
                (1, _("State")),
                (2, _("Municipality")),
                (3, _("Sub Municipality")),
            ],
            "time_resolutions": [
                ("day", _("Day")),
                ("week", _("Week")),
                ("month", _("Month")),
                ("year", _("Year")),
            ],
        }
        return render(request, self.template_name, context)

    def post(self, request, model_id: int):
        model = Model.objects.get(pk=model_id)

        if request.user == model.author.user:
            if "save_model" in request.POST:
                form = UpdateModelForm(request.POST)
                if not form.is_valid():
                    messages.error(request, _("Invalid form"))
                    redirect("models")

                repository = form.cleaned_data["model_repository"]
                try:
                    description = form.cleaned_data["model_description"]
                except KeyError:
                    description = ""

                if not any(
                    str(repository).startswith(p)
                    for p in ["https://github.com/", "github.com/"]
                ):
                    repository = f"https://github.com/{repository}/"

                payload = {
                    "name": form.cleaned_data["model_name"],
                    "description": description,
                    "repository": repository,
                    "implementation_language": form.cleaned_data[
                        "model_language"
                    ],
                    "type": form.cleaned_data["model_type"],
                    "ADM_level": form.cleaned_data["model_adm_level"],
                    "time_resolution": form.cleaned_data[
                        "model_time_resolution"
                    ],
                }

                status_code, model = update_model(
                    request=request,
                    model_id=model_id,
                    payload=payload,
                )

                if status_code == 201:
                    messages.success(request, _("Model updated successfully"))
                elif status_code == 401:
                    messages.error(request, _("Unauthorized"))
                else:
                    messages.error(
                        request,
                        (
                            _("Failed to update model: "),
                            f"{status_code}",
                        ),
                    )

            elif "delete_model" in request.POST:
                form = DeleteModelForm(request.POST)
                if form.is_valid():
                    model_id = form.cleaned_data["model_id"]
                    delete_model(request, model_id)
                    messages.warning(request, _("Model deleted"))
                else:
                    messages.error(request, _("Cannot delete Model"))

        return redirect("models")


class PredictionsView(View):
    template_name = "main/predictions.html"

    def get(self, request):
        get = request.GET.get

        def store_session(**params) -> None:
            """Stores parameters in session"""
            for param, value in params.items():
                if value:
                    request.session[param] = value
                else:
                    request.session[param] = None

        # Parameters that come in the request
        predicts_params = {
            "page": get("page", 1),
            "per_page": get("per_page", 50),
            "id": get("id", ""),
            "model_id": get("model_id", ""),
            "model_name": get("model_name", ""),
            "author_name": get("author_name", ""),
            "author_username": get("author_username", ""),
            "author_institution": get("author_institution", ""),
            "repository": get("repository", ""),
            "implementation_language": get("implementation_language", ""),
            "type": get("type", ""),
            "commit": get("commit", ""),
            "start": get("start", ""),
            "end": get("end", ""),
        }

        def get_filters() -> (
            tuple[PredictionFilterSchema, PagesPagination.Input]
        ):
            """Gets parameters from request"""
            filters = PredictionFilterSchema()
            pagination = PagesPagination.Input(
                page=int(request.session.get("page") or 1),
                per_page=int(request.session.get("per_page") or 50),
            )

            for param, value in predicts_params.items():
                store_session(**{param: value})
                if value:
                    if param in ["page", "per_page"]:
                        setattr(pagination, param, int(value))
                    else:
                        setattr(filters, param, value)

            return filters, pagination

        # Request from user
        filters, pagination = get_filters()

        # API request
        response = list_predictions(
            request, filters=filters, ninja_pagination=pagination
        )

        context = {}

        # Build equivalent API url
        api_url = (
            request.build_absolute_uri(reverse("api-1:list_predictions")) + "?"
        )
        api_url += build_url_path(response["pagination"].items())
        api_url += "&" + build_url_path(filters.__dict__.items())
        context["api_url"] = api_url

        languages_refs = ImplementationLanguage.objects.annotate(
            ref_count=Count("model")
        ).filter(ref_count__gt=0)

        langs = languages_refs.values_list("language", flat=True)

        context["implementation_languages"] = list(langs)
        context["pagination"] = response["pagination"]

        if response["items"]:
            context["predictions"] = response["items"]

        if response["message"]:
            messages.warning(request, message=response["message"])

        return render(request, self.template_name, context)


class EditPredictionView(View):
    template_name = "main/edit-prediction.html"

    def get(self, request, prediction_id: int):
        prediction = get_object_or_404(Prediction, pk=prediction_id)
        models = Model.objects.filter(
            author__user=prediction.model.author.user
        )

        if request.user != prediction.model.author.user:
            return redirect("predictions")

        context = {
            "prediction": prediction,
            "user_models": models,
        }
        return render(request, self.template_name, context)

    def post(self, request, prediction_id: int):
        prediction = Prediction.objects.get(pk=prediction_id)

        if request.user == prediction.model.author.user:
            if "save_prediction" in request.POST:
                form = UpdatePredictionForm(request.POST)
                if not form.is_valid():
                    messages.error(request, "Invalid form")
                    redirect("predictions")

                try:
                    description = form.cleaned_data["prediction_description"]
                except KeyError:
                    description = ""

                model = Model.objects.get(
                    pk=form.cleaned_data["prediction_model"]
                )

                payload = {
                    "model": model,
                    "description": description,
                    "commit": form.cleaned_data["prediction_commit"],
                    "predict_date": form.cleaned_data["prediction_date"],
                }

                status_code, prediction = update_prediction(
                    request=request,
                    predict_id=prediction_id,
                    payload=payload,
                )

                if status_code == 201:
                    messages.success(
                        request, _("Prediction updated successfully")
                    )
                elif status_code == 401:
                    messages.error(request, _("Unauthorized"))
                else:
                    messages.error(
                        request,
                        (
                            _("Failed to update prediction: "),
                            f"{status_code}",
                        ),
                    )

            elif "delete_prediction" in request.POST:
                form = DeletePredictionForm(request.POST)
                if form.is_valid():
                    prediction_id = form.cleaned_data["prediction_id"]
                    delete_prediction(request, prediction_id)
                    messages.warning(request, _("Prediction deleted"))
                else:
                    messages.error(request, _("Error deleting prediction"))

        return redirect("predictions")


class DataStoreView(View):
    template_name = "main/datastore.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)


def error_500(request, *args, **kwargs):
    return render(request, "main/500.html", {}, status=500)
