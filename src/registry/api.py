import datetime
from typing import List

from ninja import Query, Router
from ninja.orm.fields import AnyObject
from ninja.security import django_auth

from main.models import CustomUser
from main.schema import ForbiddenSchema, NotFoundSchema, Schema, SuccessSchema

from .models import Author, Model, Prediction
from .schema import (
    AuthorFilterSchema,
    AuthorSchema,
    ModelFilterSchema,
    ModelSchema,
    PredictionSchema,
    PredictionFilterSchema,
)

router = Router()


# [Model] Author
class AuthorIn(Schema):
    """Input for the request's body"""

    user: str
    institution: str


class AuthorInPost(Schema):
    """Input for POST update request's body"""

    institution: str


@router.get("/authors/", response=List[AuthorSchema])
def list_authors(
    request,
    filters: AuthorFilterSchema = Query(...),
):
    """Lists all authors, can be filtered by name"""
    authors = Author.objects.all()
    authors = filters.filter(authors)
    return authors


@router.get("/authors/{username}", response={200: AuthorSchema, 404: NotFoundSchema})
def get_author(request, username: str):
    """Gets author by Github username"""
    try:
        author = Author.objects.get(user__username=username)
        return 200, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.post(
    "/authors/",
    response={201: AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def create_author(request, payload: AuthorIn):
    """Posts author to database, requires a CustomUser to be created"""
    try:
        user = CustomUser.objects.get(username=payload.user)
        try:
            author = Author.objects.get(user__username=payload.user)
            if author:
                return 403, {"message": f"Author '{author}' already registered"}
        except Author.DoesNotExist:
            author = Author.objects.create(user=user, institution=payload.institution)
            return 201, author
    except CustomUser.DoesNotExist:
        return 404, {"message": f"User '{payload.user}' does not exist"}


@router.put(
    "/authors/{username}",
    response={201: AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
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
        author.save()
        return 201, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.delete(
    "/authors/{username}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def delete_author(request, username: str):
    """Deletes author"""
    try:
        author = Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to delete this author"}

        author.delete()
        return 200, {"message": f"Author '{author.user.name}' deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# [Model] Model
class ModelIn(Schema):
    name: str
    description: str = None
    author: str  # Author username
    repository: str  # TODO: Validate repository?
    implementation_language: str
    type: str


@router.get("/models/", response=List[ModelSchema])
def list_models(request, filters: ModelFilterSchema = Query(...)):
    models = Model.objects.all()
    models = filters.filter(models)
    return models


@router.get("/models/{model_id}", response={200: ModelSchema, 404: NotFoundSchema})
def get_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)  # TODO: get model by id?
        return 200, model
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.post(
    "/models/",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def create_model(request, payload: ModelIn):
    try:
        author = Author.objects.get(user__username=payload.author)
        if request.user != author.user:
            return 403, {
                "message": "You are not authorized to add a Model to this author"
            }
        payload.author = author
    except Author.DoesNotExist:
        return 404, {"message": "Invalid Author"}
    model = Model.objects.create(**payload.dict())
    return 201, model


@router.put(
    "/models/{model_id}",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def update_model(request, model_id: int, payload: ModelIn):
    try:
        model = Model.objects.get(pk=model_id)  # TODO: Update by id?

        if request.user != model.author.user:  # TODO: allow admins here
            return 403, {"message": "You are not authorized to update this Model"}

        try:
            author = Author.objects.get(user__username=payload.author)
            payload.author = author

            for attr, value in payload.dict().items():
                setattr(model, attr, value)

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
)
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)

        if request.user != model.author.user:
            return 403, {"message": "You are not authorized to delete this Model"}

        model.delete()
        return 204, {"message": f"Model {model.name} deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Model not found"}


# [Model] Prediction
class PredictionIn(Schema):
    model: ModelSchema  # TODO: change it. Issue #20
    description: str = None
    commit: str
    predict_date: datetime.date
    prediction: AnyObject


@router.get("/predictions/", response=List[PredictionSchema])
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
)
def get_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)  # TODO: get by id?
        return 200, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.post(
    "/predictions/",
    response={201: PredictionSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def create_prediction(request, payload: PredictionIn):
    try:
        model = Model.objects.get(name=payload.model)  # TODO: get by name?

        if request.user != model.author.user:
            return 403, {
                "message": "You are not authorized to add a prediction to this model"
            }

        payload.model = model
        # TODO: Add commit verification here #19
        prediction = Prediction.objects.create(**payload.dict())
        return 201, prediction
    except Model.DoesNotExist:
        return 404, {"message": f"Model '{payload.model}' not found"}


@router.put(
    "/predictions/{predict_id}",
    response={201: PredictionSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def update_prediction(request, predict_id: int, payload: PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {"message": "You are not authorized to update this prediction"}

        for attr, value in payload.dict().items():
            setattr(prediction, attr, value)
        # TODO: Add commit verification if commit has changed
        prediction.save()
        return 201, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.delete(
    "/predictions/{predict_id}",
    response={204: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
)
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {"message": "You are not authorized to delete this prediction"}

        prediction.delete()
        return 204, {"message": f"Prediction {prediction.id} deleted successfully"}
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}
