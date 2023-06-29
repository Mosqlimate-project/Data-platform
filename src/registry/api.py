import datetime
from typing import List, Optional
from django.db.models import Q

from .models import Author, Model, Prediction
from main.models import CustomUser
from ninja import Router
from ninja.orm.fields import AnyObject
from .schema import (
    AuthorSchema,
    ModelSchema,
    NotFoundSchema,
    PredictionSchema,
    ForbiddenSchema,
    Schema,
)

router = Router()


# [Model] Author
class AuthorIn(Schema):
    """Input for the request's body"""

    user: str
    institution: str


class AuthorInPost(Schema):
    """Input for POST's request body"""

    institution: str


@router.get("/authors/", response=List[AuthorSchema])
def list_authors(request, name: Optional[str] = None):
    """Lists all authors, can be filtered by name"""
    authors = Author.objects.all()
    if name:
        for wrd in name.split():
            res = authors.filter(
                Q(user__first_name__icontains=wrd) | Q(user__last_name__icontains=wrd)
            )
        return res
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
    "/authors/", response={201: AuthorSchema, 404: NotFoundSchema, 403: ForbiddenSchema}
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
        return 404, {"message": f"User '{payload.user}' does not exist."}


@router.put(
    "/authors/{username}",
    response={201: AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
)
def update_author(request, username: str, payload: AuthorInPost):
    """
    Updates author. It is not possible to change Author's
    user and this post method can only be called by the user
    """
    try:
        author = Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to update this author."}

        author.institution = payload.institution
        author.save()
        return 201, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.delete(
    "/authors/{username}",
    response={204: None, 403: ForbiddenSchema, 404: NotFoundSchema},
)
def delete_author(request, username: str):
    """Deletes author"""
    try:
        author = Author.objects.get(user__username=username)
        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to delete this author."}
        author.delete()
        return 204
    except Author.DoesNotExist:
        return (404, {"message": "Author not found"})


# [Model] Model
class ModelIn(Schema):
    name: str
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: str
    type: str


@router.get("/models/", response=List[ModelSchema])
def list_models(request, name: Optional[str] = None):
    if name:
        name_filter = Model.objects.filter(name__icontains=name)
        return list(name_filter.select_related("author"))

    models = Model.objects.all()
    return models.select_related("author")


@router.get("/models/{model_id}", response={200: ModelSchema, 404: NotFoundSchema})
def get_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        return (200, model)
    except Model.DoesNotExist:
        return (404, {"message": "Model not found"})


@router.post("/models/", response={201: ModelSchema})
def create_model(request, payload: ModelIn):
    model = Model.objects.create(**payload.dict())
    return (201, model)


@router.put("/models/{model_id}", response={201: ModelSchema, 404: NotFoundSchema})
def update_model(request, model_id: int, payload: ModelIn):
    try:
        model = Model.objects.get(pk=model_id)

        for attr, value in payload.dict().items():
            setattr(model, attr, value)

        model.save()
        return (201, model)
    except Model.DoesNotExist:
        return (404, {"message": "Model not found"})


@router.delete("/models/{model_id}", response={204: None, 404: NotFoundSchema})
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        model.delete()
        return 204
    except Author.DoesNotExist:
        return (404, {"message": "Model not found"})


# [Model] Prediction
class PredictionIn(Schema):
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: datetime.date
    prediction: AnyObject


@router.get("/predictions/", response=List[PredictionSchema])
def list_predictions(request, model_name: Optional[str] = None):
    if model_name:
        name_filter = Prediction.objects.filter(model__name__icontains=model_name)
        return list(name_filter.select_related("model"))

    prediction = Prediction.objects.all()
    return prediction.select_related("model")


@router.get(
    "/predictions/{predict_id}",
    response={200: PredictionSchema, 404: NotFoundSchema},
)
def get_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        return (200, prediction)
    except Prediction.DoesNotExist:
        return (404, {"message": "Prediction not found"})


@router.post("/predictions/", response={201: PredictionSchema})
def create_prediction(request, payload: PredictionIn):
    prediction = Prediction.objects.create(**payload.dict())
    return (201, prediction)


@router.put(
    "/predictions/{predict_id}",
    response={201: PredictionSchema, 404: NotFoundSchema},
)
def update_prediction(request, predict_id: int, payload: PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        for attr, value in payload.dict().items():
            setattr(prediction, attr, value)

        prediction.save()
        return (201, prediction)
    except Prediction.DoesNotExist:
        return (404, {"message": "Prediction not found"})


@router.delete("/predictions/{predict_id}", response={204: None, 404: NotFoundSchema})
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        prediction.delete()
        return 204
    except Prediction.DoesNotExist:
        return (404, {"message": "Prediction not found"})