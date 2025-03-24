from typing import List, Literal

import pandas as pd
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Count
from django.forms import Form
from django.views.decorators.csrf import csrf_exempt
from main.schema import (
    ForbiddenSchema,
    InternalErrorSchema,
    NotFoundSchema,
    Schema,
    SuccessSchema,
    UnprocessableContentSchema,
)
from ninja import Query, Router
from ninja.pagination import paginate
from ninja.security import django_auth

from users.auth import UidKeyAuth
from .models import (
    Author,
    Model,
    ImplementationLanguage,
    Prediction,
    PredictionDataRow,
)
from .pagination import PagesPagination
from .schema import (
    AuthorFilterSchema,
    AuthorSchema,
    ModelFilterSchema,
    ModelSchema,
    PredictionFilterSchema,
    PredictionSchema,
    PredictionOut,
    PredictionIn,
    PredictionDataRowOut,
)
from .utils import calling_via_swagger
from vis.brasil.models import State

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


@router.get(
    "/authors/", response=List[AuthorSchema], tags=["registry", "authors"]
)
@csrf_exempt
def list_authors(
    request,
    filters: AuthorFilterSchema = Query(...),
):
    """
    Lists all authors, can be filtered by name
    Authors that don't have any Model won't be listed
    """
    models_count = Author.objects.annotate(num_models=Count("model"))
    authors = models_count.filter(num_models__gt=0)
    return filters.filter(authors).order_by("-updated")


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
            return 403, {
                "message": "You are not authorized to update this author"
            }

        author.institution = payload.institution

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
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
            return 403, {
                "message": "You are not authorized to delete this author"
            }

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
            author.delete()

        return 200, {
            "message": f"Author '{author.user.name}' deleted successfully"
        }
    except Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# [Model] Model
class ModelIn(Schema):
    name: str
    description: str = None
    repository: str  # TODO: Validate repository?
    implementation_language: str
    disease: Literal["dengue", "zika", "chikungunya"]
    temporal: bool
    spatial: bool
    categorical: bool
    ADM_level: Literal[0, 1, 2, 3]
    time_resolution: Literal["day", "week", "month", "year"]
    sprint: bool = False


@router.get(
    "/models/", response=List[ModelSchema], tags=["registry", "models"]
)
@paginate(PagesPagination)
@csrf_exempt
def list_models(
    request,
    filters: ModelFilterSchema = Query(...),
    **kwargs,
):
    models = Model.objects.all()
    models = filters.filter(models)
    return models.order_by("-updated")


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
    response={
        201: ModelSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        422: UnprocessableContentSchema,
    },
    auth=uidkey,
    tags=["registry", "models"],
)
@csrf_exempt
def create_model(request, payload: ModelIn):
    uid_key_header = request.headers.get("X-UID-Key")
    if uid_key_header:
        uid, _ = uid_key_header.split(":")
        author = Author.objects.get(user__username=uid)
    else:
        return 403, {"message": "X-UID-Key header is missing"}

    data = payload.dict()
    data["implementation_language"] = ImplementationLanguage.objects.get(
        language__iexact=payload.implementation_language
    )

    model = Model(author=author, **data)

    if not calling_via_swagger(request):
        try:
            model.save()
        except IntegrityError:
            return 403, {"message": f"Model {model.name} already exists"}
    return 201, model


class UpdateModelForm(Schema):
    # author: str
    name: str
    description: str = None
    repository: str
    implementation_language: str
    categorical: bool
    temporal: bool
    spatial: bool


@router.put(
    "/models/{model_id}",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    include_in_schema=False,
)
def update_model(request, model_id: int, payload: UpdateModelForm = Form(...)):
    try:
        model = Model.objects.get(pk=model_id)

        if request.user != model.author.user:  # TODO: allow admins here
            return 403, {
                "message": "You are not authorized to update this Model"
            }

        try:
            for attr, value in payload.items():
                if attr == "implementation_language":
                    try:
                        lang = ImplementationLanguage.objects.get(
                            language__iexact=value
                        )
                        value = lang
                    except ImplementationLanguage.DoesNotExist:
                        similar_lang = ImplementationLanguage.objects.filter(
                            language__icontains=value
                        )[0]
                        if similar_lang:
                            return 404, {
                                "message": (
                                    f"Unknown language '{value}', "
                                    f"did you mean '{similar_lang}'?"
                                )
                            }
                        return 404, {"message": f"Unknown language {value}"}
                setattr(model, attr, value)

            if not calling_via_swagger(request):
                model.save()

            return 201, model
        except Author.DoesNotExist:
            return 404, {
                "message": (
                    f"Author '{payload.author}' not found, use username"
                    "instead"
                )
            }
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.delete(
    "/models/{model_id}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "models"],
    include_in_schema=False,
)
def delete_model(request, model_id: int):
    try:
        model = Model.objects.get(pk=model_id)

        if request.user != model.author.user:
            return 403, {
                "message": "You are not authorized to delete this Model"
            }

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
            model.delete()

        return 200, {"message": f"Model {model.name} deleted successfully"}
    except Author.DoesNotExist:
        return 404, {"message": "Model not found"}


# [Model] Prediction
@router.get(
    "/predictions/",
    response=List[PredictionOut],
    tags=["registry", "predictions"],
)
@paginate(PagesPagination)
@csrf_exempt
def list_predictions(
    request,
    filters: PredictionFilterSchema = Query(...),
    **kwargs,
):
    predictions = Prediction.objects.all()
    predictions = filters.filter(predictions)
    return predictions.order_by("-updated")


@router.get(
    "/predictions/{predict_id}",
    response={200: PredictionOut, 404: NotFoundSchema},
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
    response={
        201: PredictionOut,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        422: UnprocessableContentSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey,
    tags=["registry", "predictions"],
)
@csrf_exempt
def create_prediction(request, payload: PredictionIn):
    def parse_data(predict: Prediction, data: List[dict]):
        if not calling_via_swagger(request):
            for row in data:
                PredictionDataRow.objects.get_or_create(
                    predict=predict,
                    date=pd.to_datetime(row["date"]).date(),
                    pred=row["pred"],
                    lower_95=row["lower_95"],
                    lower_90=row["lower_90"],
                    lower_80=row["lower_80"],
                    lower_50=row["lower_50"],
                    upper_50=row["upper_50"],
                    upper_80=row["upper_80"],
                    upper_90=row["upper_90"],
                    upper_95=row["upper_95"],
                )

    if payload.adm_1:
        adm_1 = State.objects.get(uf=payload.adm_1).geocode
    elif payload.adm_2:
        adm_1 = State.objects.get(geocode=str(payload.adm_2)[:2]).geocode
    else:
        adm_1 = None
        raise NotImplementedError()

    df = pd.DataFrame(data=[r.dict() for r in payload.prediction])

    model = Model.objects.get(pk=payload.model)
    prediction = Prediction(
        model=model,
        description=payload.description,
        commit=payload.commit,
        predict_date=payload.predict_date,
        adm_0_geocode=payload.adm_0,
        adm_1_geocode=adm_1 or None,
        adm_2_geocode=payload.adm_2 or None,
        adm_3_geocode=payload.adm_3 or None,
        date_ini_prediction=min(df.date),
        date_end_prediction=max(df.date),
    )

    if calling_via_swagger(request):
        data = [PredictionDataRowOut(**r.dict()) for r in payload.prediction]
        return 201, PredictionOut(
            id=None,
            model=model.id,
            description=prediction.description,
            commit=prediction.commit,
            predict_date=prediction.predict_date,
            adm_0=prediction.adm_0_geocode,
            adm_1=prediction.adm_1_geocode,
            adm_2=prediction.adm_2_geocode,
            adm_3=prediction.adm_3_geocode,
            data=data,
        )

    prediction.save()
    parse_data(prediction, [r.dict() for r in payload.prediction])
    return 201, prediction


@router.put(
    "/predictions/{predict_id}",
    response={
        201: PredictionSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
    },
    auth=django_auth,
    tags=["registry", "predictions"],
    include_in_schema=False,
)
def update_prediction(request, predict_id: int, payload: PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {
                "message": "You are not authorized to update this prediction"
            }

        for attr, value in payload.items():
            setattr(prediction, attr, value)
        # TODO: Add commit verification if commit has changed

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
            prediction.save()

        return 201, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.delete(
    "/predictions/{predict_id}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    tags=["registry", "predictions"],
    include_in_schema=False,
)
def delete_prediction(request, predict_id: int):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {
                "message": "You are not authorized to delete this prediction"
            }

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
            prediction.delete()

        return 200, {
            "message": f"Prediction {prediction.id} deleted successfully"
        }
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}
