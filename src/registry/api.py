import datetime
from typing import List, Optional

from ninja import Router, Query
from ninja.orm.fields import AnyObject
from ninja.security import django_auth

from main.models import CustomUser

from .models import Author, Model, Prediction
from . import schema as s

router = Router()


# [Model] Author
class AuthorIn(s.Schema):
    """Input for the request's body"""

    user: str
    institution: str


class AuthorInPost(s.Schema):
    """Input for POST's request body"""

    institution: str


@router.get("/authors/", response=List[s.AuthorSchema])
def list_authors(
    request,
    filters: s.AuthorFilterSchema = Query(...),
):
    """Lists all authors, can be filtered by name"""
    authors = Author.objects.all()
    authors = filters.filter(authors)
    return authors


@router.get(
    "/authors/{username}", response={200: s.AuthorSchema, 404: s.NotFoundSchema}
)
def get_author(request, username: str):
    """Gets author by Github username"""
    try:
        author = Author.objects.get(user__username=username)
        return 200, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.post(
    "/authors/",
    response={201: s.AuthorSchema, 404: s.NotFoundSchema, 403: s.ForbiddenSchema},
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
        return 404, {"message": f"User '{payload.user}' does not exist."}


@router.put(
    "/authors/{username}",
    response={201: s.AuthorSchema, 403: s.ForbiddenSchema, 404: s.NotFoundSchema},
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
            return 403, {"message": "You are not authorized to update this author."}

        author.institution = payload.institution
        author.save()
        return 201, author
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.delete(
    "/authors/{username}",
    response={200: s.SuccessSchema, 403: s.ForbiddenSchema, 404: s.NotFoundSchema},
    auth=django_auth,
)
def delete_author(request, username: str):
    """Deletes author"""
    try:
        author = Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {"message": "You are not authorized to delete this author."}

        author.delete()
        return 200, {"message": f"Author {author.user.name} deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# [Model] Model
class ModelIn(s.Schema):
    name: str
    description: str = None
    author: s.AuthorSchema
    repository: str
    implementation_language: str
    type: str


@router.get("/models/", response=List[s.ModelSchema])
def list_models(request, name: Optional[str] = None):
    if name:
        name_filter = Model.objects.filter(name__icontains=name)
        return list(name_filter.select_related("author"))

    models = Model.objects.all()
    return models.select_related("author")


@router.get("/models/{model_id}", response={200: s.ModelSchema, 404: s.NotFoundSchema})
def get_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        return (200, model)
    except Model.DoesNotExist:
        return (404, {"message": "Model not found"})


@router.post("/models/", response={201: s.ModelSchema})
def create_model(request, payload: ModelIn):
    model = Model.objects.create(**payload.dict())
    return (201, model)


@router.put("/models/{model_id}", response={201: s.ModelSchema, 404: s.NotFoundSchema})
def update_model(request, model_id: int, payload: ModelIn):
    try:
        model = Model.objects.get(pk=model_id)

        for attr, value in payload.dict().items():
            setattr(model, attr, value)

        model.save()
        return (201, model)
    except Model.DoesNotExist:
        return (404, {"message": "Model not found"})


@router.delete("/models/{model_id}", response={204: None, 404: s.NotFoundSchema})
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        model.delete()
        return 204
    except Author.DoesNotExist:
        return (404, {"message": "Model not found"})


# [Model] Prediction
class PredictionIn(s.Schema):
    model: s.ModelSchema
    description: str = None
    commit: str
    predict_date: datetime.date
    prediction: AnyObject


@router.get("/predictions/", response=List[s.PredictionSchema])
def list_predictions(request, model_name: Optional[str] = None):
    if model_name:
        name_filter = Prediction.objects.filter(model__name__icontains=model_name)
        return list(name_filter.select_related("model"))

    prediction = Prediction.objects.all()
    return prediction.select_related("model")


@router.get(
    "/predictions/{predict_id}",
    response={200: s.PredictionSchema, 404: s.NotFoundSchema},
)
def get_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        return (200, prediction)
    except Prediction.DoesNotExist:
        return (404, {"message": "Prediction not found"})


@router.post("/predictions/", response={201: s.PredictionSchema})
def create_prediction(request, payload: PredictionIn):
    prediction = Prediction.objects.create(**payload.dict())
    return (201, prediction)


@router.put(
    "/predictions/{predict_id}",
    response={201: s.PredictionSchema, 404: s.NotFoundSchema},
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


@router.delete("/predictions/{predict_id}", response={204: None, 404: s.NotFoundSchema})
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        prediction.delete()
        return 204
    except Prediction.DoesNotExist:
        return (404, {"message": "Prediction not found"})
