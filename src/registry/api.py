import datetime
from typing import List
from urllib.parse import urlparse

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from ninja import Query, Router
from ninja.orm.fields import AnyObject
from ninja.security import django_auth
from ninja.pagination import paginate

from main.schema import ForbiddenSchema, NotFoundSchema, Schema, SuccessSchema
from users.auth import UidKeyAuth

from .models import Author, Model, Prediction
from .schema import (
    AuthorFilterSchema,
    AuthorSchema,
    ModelFilterSchema,
    ModelSchema,
    PredictionFilterSchema,
    PredictionSchema,
)
from .utils import calling_via_swagger

router = Router()
uidkey = UidKeyAuth()
User = get_user_model()


# [Model] Author
class AuthorIn(Schema):
    """Input for the request's body"""

    user: str
    institution: str


class AuthorInPost(Schema):
    """Input for POST update request's body"""

    institution: str


@router.get("/authors/", response=List[AuthorSchema], tags=["registry", "authors"])
@csrf_exempt
def list_authors(
    request,
    filters: AuthorFilterSchema = Query(...),
):
    """
    Lists all authors, can be filtered by name
    Authors that don't have any Prediction won't be listed
    """
    models_count = Author.objects.annotate(num_models=Count("model"))
    authors = models_count.filter(num_models__gt=0)
    return authors


@router.get(
    "/authors/{username}",
    response={200: AuthorSchema, 404: NotFoundSchema},
    tags=["registry", "authors"],
)
@csrf_exempt
def get_author(request, username: str):
    """Gets author by Github username"""
    try:
        author = Author.objects.get(user__username=username)
        return 200, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# Authors are automatically created at User creation
# @router.post(
#     "/authors/",
#     response={201: AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
#     auth=django_auth,
#     tags=["registry", "authors"],
#     include_in_schema=False,
# )
# def create_author(request, payload: AuthorIn):
#     """
#     Posts author to database, requires a User to be created
#     @note: This call is related to User and shouldn't be done only via API Call
#     """
#     try:
#         user = User.objects.get(username=payload.user)
#         try:
#             author = Author.objects.get(user__username=payload.user)
#             if author:
#                 return 403, {"message": f"Author '{author}' already registered"}
#         except Author.DoesNotExist:
#             author = Author.objects.create(user=user, institution=payload.institution)
#             return 201, author
#     except User.DoesNotExist:
#         return 404, {"message": f"User '{payload.user}' does not exist"}


@router.put(
    "/authors/{username}",
    response={201: AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "authors"],
    include_in_schema=False,
)
def update_author(request, username: str, payload: AuthorInPost):
    """
    Updates author. It is not possible to change Author's
    user and this post method can only be called by the user
    """
    try:
        author = Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to update this author"}

        author.institution = payload.institution

        if not calling_via_swagger(request):
            # Not realy required, since include_in_schema=False
            author.save()

        return 201, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.delete(
    "/authors/{username}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "authors"],
    include_in_schema=False,
)
def delete_author(request, username: str):
    """
    Deletes author
    @note: This call is related to User and shouldn't be done only via API Call
    """
    try:
        author = Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to delete this author"}

        if not calling_via_swagger(request):
            # Not realy required, since include_in_schema=False
            author.delete()

        return 200, {"message": f"Author '{author.user.name}' deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# [Model] Model
class ModelIn(Schema):
    name: str
    description: str = None
    repository: str  # TODO: Validate repository?
    implementation_language: str
    type: str


class ModelInUpdate(ModelIn):
    """
    Enable User to update Model's author.
    With this operation, the user will lose model's permissions
    """

    author: str


@router.get("/models/", response=List[ModelSchema], tags=["registry", "models"])
@csrf_exempt
def list_models(request, filters: ModelFilterSchema = Query(...)):
    models = Model.objects.all()
    models = filters.filter(models)
    return models


@router.get(
    "/models/{model_id}",
    response={200: ModelSchema, 404: NotFoundSchema},
    tags=["registry", "models"],
)
@csrf_exempt
def get_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)  # TODO: get model by id?
        return 200, model
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.post(
    "/models/",
    response={201: ModelSchema, 403: ForbiddenSchema},
    auth=uidkey,
    tags=["registry", "models"],
)
@csrf_exempt
def create_model(request, payload: ModelIn):
    repo_url = urlparse(payload.repository)
    if repo_url.netloc != "github.com":  # TODO: add gitlab here?
        return 403, {"message": "Model repository must be on Github"}
    if not repo_url.path:
        return 403, {"message": "Invalid repository"}
    uid, _ = request.headers.get("X-UID-Key").split(":")
    author = Author.objects.get(user__username=uid)
    model = Model(author=author, **payload.dict())
    if not calling_via_swagger(request):
        try:
            model.save()
        except IntegrityError:
            return 403, {"message": f"Model {model.name} already exists"}
    return 201, model


@router.put(
    "/models/{model_id}",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "models"],
    include_in_schema=False,
)
def update_model(request, model_id: int, payload: ModelInUpdate):
    try:
        model = Model.objects.get(pk=model_id)  # TODO: Update by id?

        if request.user != model.author.user:  # TODO: allow admins here
            return 403, {"message": "You are not authorized to update this Model"}

        try:
            author = Author.objects.get(user__username=request.user)
            payload.author = author

            for attr, value in payload.dict().items():
                setattr(model, attr, value)

            if not calling_via_swagger(request):
                # Not realy required, since include_in_schema=False
                model.save()

            return 201, model
        except Author.DoesNotExist:
            return 404, {
                "message": (
                    f"Author '{payload.author}' not found, use username instead"
                )
            }
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.delete(
    "/models/{model_id}",
    response={204: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "models"],
    include_in_schema=False,
)
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)

        if request.user != model.author.user:
            return 403, {"message": "You are not authorized to delete this Model"}

        if not calling_via_swagger(request):
            # Not realy required, since include_in_schema=False
            model.delete()

        return 204, {"message": f"Model {model.name} deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Model not found"}


# [Model] Prediction
class PredictionIn(Schema):
    model: int  # TODO: change it. Issue #20
    description: str = None
    commit: str
    predict_date: datetime.date  # YYYY-mm-dd
    prediction: AnyObject


@router.get(
    "/predictions/", response=List[PredictionSchema], tags=["registry", "predictions"]
)
@paginate
@csrf_exempt
def list_predictions(
    request,
    filters: PredictionFilterSchema = Query(...),
):
    predictions = Prediction.objects.all()
    predictions = filters.filter(predictions)
    return predictions


@router.get(
    "/predictions/{predict_id}",
    response={200: PredictionSchema, 404: NotFoundSchema},
    tags=["registry", "predictions"],
)
@csrf_exempt
def get_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)  # TODO: get by id?
        return 200, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.post(
    "/predictions/",
    response={201: PredictionSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=uidkey,
    tags=["registry", "predictions"],
)
@csrf_exempt
def create_prediction(request, payload: PredictionIn):
    try:
        model = Model.objects.get(pk=payload.model)  # TODO: get by id?
    except Model.DoesNotExist:
        return 404, {"message": f"Model '{payload.model}' not found"}

    payload.model = model
    # TODO: Add commit verification here #19
    prediction = Prediction(**payload.dict())

    if not calling_via_swagger(request):
        prediction.save()

    return 201, prediction


@router.put(
    "/predictions/{predict_id}",
    response={201: PredictionSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "predictions"],
    include_in_schema=False,
)
def update_prediction(request, predict_id: int, payload: PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {"message": "You are not authorized to update this prediction"}

        for attr, value in payload.dict().items():
            setattr(prediction, attr, value)
        # TODO: Add commit verification if commit has changed

        if not calling_via_swagger(request):
            # Not realy required, since include_in_schema=False
            prediction.save()

        return 201, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.delete(
    "/predictions/{predict_id}",
    response={204: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "predictions"],
    include_in_schema=False,
)
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {"message": "You are not authorized to delete this prediction"}

        if not calling_via_swagger(request):
            # Not realy required, since include_in_schema=False
            prediction.delete()

        return 204, {"message": f"Prediction {prediction.id} deleted successfully"}
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}
