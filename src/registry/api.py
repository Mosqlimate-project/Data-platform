import datetime
from typing import List, Optional
from ninja import Router
from ninja.orm.fields import AnyObject

from .models import Author, Model, Prediction
from .schema import (
    Schema,
    ModelSchema,
    AuthorSchema,
    PredictionSchema,
    NotFoundSchema,
)


router = Router()

# [Model] Author
class AuthorIn(Schema):
    """Input for the request's body"""

    name: str
    email: str
    institution: str


@router.get('/authors/', response=List[AuthorSchema])
def list_authors(request, name: Optional[str] = None):
    """Lists all authors, can be filtered by name"""
    if name:
        return Author.objects.filter(name__icontains=name)
    return Author.objects.all()


@router.get(
    '/authors/{author_id}', response={200: AuthorSchema, 404: NotFoundSchema}
)
def get_author(request, author_id: int):
    """Gets author by id"""
    try:
        author = Author.objects.get(pk=author_id)
        return (200, author)
    except Author.DoesNotExist as e:
        return (404, {'message': 'Author not found'})


@router.post('/authors/', response={201: AuthorSchema})
def create_author(request, payload: AuthorIn):
    """Posts author to database"""
    author = Author.objects.create(**payload.dict())
    return (201, author)


@router.put(
    '/authors/{author_id}', response={201: AuthorSchema, 404: NotFoundSchema}
)
def update_author(request, author_id: int, payload: AuthorIn):
    """Updates author"""
    try:
        author = Author.objects.get(pk=author_id)

        for attr, value in payload.dict().items():
            setattr(author, attr, value)

        author.save()
        return (201, author)
    except Author.DoesNotExist as e:
        return (404, {'message': 'Author not found'})


@router.delete(
    '/authors/{author_id}', response={204: None, 404: NotFoundSchema}
)
def delete_author(request, author_id: int):
    """Deletes author"""
    try:
        author = Author.objects.get(pk=author_id)
        author.delete()
        return 204
    except Author.DoesNotExist as e:
        return (404, {'message': 'Author not found'})


# [Model] Model
class ModelIn(Schema):
    name: str
    description: str = None
    author: AuthorSchema
    repository: str
    implementation_language: str
    type: str


@router.get('/models/', response=List[ModelSchema])
def list_models(request, name: Optional[str] = None):
    if name:
        name_filter = Model.objects.filter(name__icontains=name)
        return list(name_filter.select_related('author'))

    models = Model.objects.all()
    return models.select_related('author')


@router.get(
    '/models/{model_id}', response={200: ModelSchema, 404: NotFoundSchema}
)
def get_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        return (200, model)
    except Model.DoesNotExist as e:
        return (404, {'message': 'Model not found'})


@router.post('/models/', response={201: ModelSchema})
def create_model(request, payload: ModelIn):
    model = Model.objects.create(**payload.dict())
    return (201, model)


@router.put(
    '/models/{model_id}', response={201: ModelSchema, 404: NotFoundSchema}
)
def update_model(request, model_id: int, payload: ModelIn):
    try:
        model = Model.objects.get(pk=model_id)

        for attr, value in payload.dict().items():
            setattr(model, attr, value)

        model.save()
        return (201, model)
    except Model.DoesNotExist as e:
        return (404, {'message': 'Model not found'})


@router.delete('/models/{model_id}', response={204: None, 404: NotFoundSchema})
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)
        model.delete()
        return 204
    except Author.DoesNotExist as e:
        return (404, {'message': 'Model not found'})


# [Model] Prediction
class PredictionIn(Schema):
    model: ModelSchema
    description: str = None
    commit: str
    predict_date: datetime.date
    prediction: AnyObject


@router.get('/predictions/', response=List[PredictionSchema])
def list_predictions(request, model_name: Optional[str] = None):
    if model_name:
        name_filter = Prediction.objects.filter(
            model__name__icontains=model_name
        )
        return list(name_filter.select_related('model'))

    prediction = Prediction.objects.all()
    return prediction.select_related('model')


@router.get(
    '/predictions/{predict_id}',
    response={200: PredictionSchema, 404: NotFoundSchema},
)
def get_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        return (200, prediction)
    except Prediction.DoesNotExist as e:
        return (404, {'message': 'Prediction not found'})


@router.post('/predictions/', response={201: PredictionSchema})
def create_prediction(request, payload: PredictionIn):
    prediction = Prediction.objects.create(**payload.dict())
    return (201, prediction)


@router.put(
    '/predictions/{predict_id}',
    response={201: PredictionSchema, 404: NotFoundSchema},
)
def update_prediction(request, predict_id: int, payload: PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        for attr, value in payload.dict().items():
            setattr(prediction, attr, value)

        prediction.save()
        return (201, prediction)
    except Prediction.DoesNotExist as e:
        return (404, {'message': 'Prediction not found'})


@router.delete(
    '/predictions/{predict_id}', response={204: None, 404: NotFoundSchema}
)
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        prediction.delete()
        return 204
    except Prediction.DoesNotExist as e:
        return (404, {'message': 'Prediction not found'})
