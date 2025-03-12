import datetime
import json
from typing import List, Literal, Optional

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
from ninja.orm.fields import AnyObject
from ninja.pagination import paginate
from ninja.security import django_auth
from users.auth import UidKeyAuth

from .models import (
    Author,
    ImplementationLanguage,
    Model,
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
)
from .utils import calling_via_swagger
from .validations import (
    validate_create_model,
    validate_implementation_language,
    validate_prediction,
)

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
    validation_result = validate_create_model(payload)

    if validation_result is not None:
        return validation_result

    uid_key_header = request.headers.get("X-UID-Key")
    if uid_key_header:
        uid, _ = uid_key_header.split(":")
        author = Author.objects.get(user__username=uid)
    else:
        return 403, {"message": "X-UID-Key header is missing"}

    lang_validation_result = validate_implementation_language(
        payload.implementation_language
    )

    if lang_validation_result is not None:
        return lang_validation_result

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

                predictions = Prediction.objects.filter(model=model)
                for prediction in predictions:
                    prediction.parse_metadata()

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
class PredictionIn(Schema):
    model: int
    description: str = None
    commit: str
    predict_date: datetime.date  # YYYY-mm-dd
    prediction: Optional[AnyObject] = None


@router.get(
    "/predictions/",
    response=List[PredictionSchema],
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
    response={
        201: PredictionSchema,
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
    try:
        model = Model.objects.get(pk=payload.model)
    except Model.DoesNotExist:
        return 404, {"message": f"Model '{payload.model}' not found"}

    payload.model = model

    validation_result = validate_prediction(payload)

    # Returns the status code and the error message
    # if the validation fails or None if it succeeds
    if validation_result is not None:
        return validation_result

    def parse_data(predict: Prediction, df: pd.DataFrame):
        df = df.rename(columns={"dates": "date", "preds": "pred"})

        for _, row in df.iterrows():  # noqa
            adm_0 = "BRA"
            try:
                adm_1 = (
                    None
                    if (pd.isna(row.adm_1) or row.adm_1 == "NA")
                    else row.adm_1
                )
            except AttributeError:
                adm_1 = None
            try:
                adm_2 = (
                    None
                    if (pd.isna(row.adm_2) or row.adm_2 == "NA")
                    else row.adm_2
                )
            except AttributeError:
                adm_2 = None
            try:
                adm_3 = (
                    None
                    if (pd.isna(row.adm_3) or row.adm_3 == "NA")
                    else row.adm_3
                )
            except AttributeError:
                adm_3 = None

            if not calling_via_swagger(request):
                PredictionDataRow.objects.get_or_create(
                    predict=predict,
                    date=pd.to_datetime(row.date).date(),
                    pred=float(row.pred),
                    upper=float(row.upper),
                    lower=float(row.lower),
                    adm_0=adm_0,
                    adm_1=adm_1,
                    adm_2=adm_2,
                    adm_3=adm_3,
                )

    df = pd.DataFrame(json.loads(payload.prediction))
    payload_dict = payload.dict()
    del payload_dict["prediction"]
    prediction = Prediction(**payload_dict)

    if not calling_via_swagger(request):
        prediction.save()
        parse_data(prediction, df)
        prediction.parse_metadata()

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
            prediction.parse_metadata()
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
