from django.contrib import messages
from django.shortcuts import render, reverse, redirect
from django.db.models import Count
from django.views import View

from users.forms import UpdateModelForm, DeleteModelForm
from users.api import update_model
from registry.api import list_models, list_predictions, delete_model
from registry.pagination import PagesPagination
from registry.schema import ModelFilterSchema, PredictionFilterSchema
from registry.models import ImplementationLanguage


def home(request):
    return render(request, "main/home.html", {})


def about(response):
    return render(response, "main/about.html", {})


def docs(response):
    return render(response, "main/docs/index.html", {})


class ModelsView(View):
    template_name = "main/models.html"

    def get(self, request):
        print("\nGET\n")
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

            for param in predicts_params:
                value = predicts_params[param]
                store_session(**{param: value})
                if value:
                    if param in ["page", "per_page"]:
                        setattr(pagination, param, int(value))
                    else:
                        setattr(filters, param, value)

            return filters, pagination

        def build_url_path(params) -> str:
            return "&".join(
                [
                    f"{p}={v}"
                    for p, v in params
                    if v and p not in ["items", "total_items", "total_pages"]
                ]
            )

        # Request from user
        filters, pagination = get_filters()

        # API request
        response = list_models(request, filters=filters, ninja_pagination=pagination)

        context = {}

        # Build equivalent API url
        api_url = request.build_absolute_uri(reverse("api-1:list_models")) + "?"
        api_url += build_url_path(response["pagination"].items())
        api_url += "&" + build_url_path(filters.__dict__.items())
        context["api_url"] = api_url

        context["pagination"] = response["pagination"]

        languages_refs = ImplementationLanguage.objects.annotate(
            ref_count=Count("model")
        ).filter(ref_count__gt=0)

        langs = languages_refs.values_list("language", flat=True)
        context["implementation_languages"] = list(langs)

        if response["items"]:
            context["models"] = response["items"]

        if response["message"]:
            messages.warning(request, message=response["message"])

        return render(request, self.template_name, context)

    def post(self, request):
        print("\nPOST\n")

        if "edit_model" in request.POST:
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

        elif "delete_model" in request.POST:
            form = DeleteModelForm(request.POST)
            if form.is_valid():
                model_id = form.cleaned_data["model_id"]
                delete_model(request, model_id)
                messages.warning(request, "Model deleted")
            else:
                messages.error(request, "Cannot delete Model")

        else:
            messages.error(
                request, "Form error"
            )  # TODO: Find a way to retrieve form errors

        return redirect("models")


def predictions(request):
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

    def get_filters() -> tuple[PredictionFilterSchema, PagesPagination.Input]:
        """Gets parameters from request"""
        filters = PredictionFilterSchema()
        pagination = PagesPagination.Input(
            page=int(request.session.get("page") or 1),
            per_page=int(request.session.get("per_page") or 50),
        )

        for param in predicts_params:
            value = predicts_params[param]
            store_session(**{param: value})
            if value:
                if param in ["page", "per_page"]:
                    setattr(pagination, param, int(value))
                else:
                    setattr(filters, param, value)

        return filters, pagination

    def build_url_path(params) -> str:
        return "&".join(
            [
                f"{p}={v}"
                for p, v in params
                if v and p not in ["items", "total_items", "total_pages"]
            ]
        )

    # Request from user
    filters, pagination = get_filters()

    # API request
    response = list_predictions(request, filters=filters, ninja_pagination=pagination)

    context = {}

    # Build equivalent API url
    api_url = request.build_absolute_uri(reverse("api-1:list_predictions")) + "?"
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

    return render(request, "main/predictions.html", context)


def error_404(request, *args, **kwargs):
    return render(request, "main/404.html", {}, status=404)
