from typing import List, Literal
from typing_extensions import Annotated

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
from ninja import Query, Router, Field
from ninja.errors import HttpError
from ninja.pagination import paginate
from ninja.security import django_auth
from pydantic import field_validator

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
uidkey_auth = UidKeyAuth()
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
    Lists all authors, can be filtered by name.
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
    name: Annotated[str, Field(description="Model name")]
    description: Annotated[
        str, Field(default="", description="Model description")
    ]
    repository: Annotated[
        str,
        Field(
            default="https://github.com/", description="Model git repository"
        ),
    ]
    implementation_language: Annotated[
        str,
        Field(
            default="python",
            description="Model implementation programming language",
        ),
    ]
    disease: Annotated[
        Literal["dengue", "zika", "chikungunya"],
        Field(default="dengue", description="Model for disease"),
    ]
    temporal: bool
    spatial: bool
    categorical: bool
    ADM_level: Annotated[
        Literal[0, 1, 2, 3],
        Field(
            default=0,
            description=(
                "Administrative level. Country, State, Municipality and "
                "SubMunicipality respectively"
            ),
        ),
    ]
    time_resolution: Annotated[
        Literal["day", "week", "month", "year"],
        Field(
            default="week",
            description=(
                "Time resolution. Options: 'day', 'week', 'month' or 'year'"
            ),
        ),
    ]
    sprint: Annotated[
        bool, Field(default=False, description="Model for Sprint 2024/25")
    ]

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if len(v) < 50:
            raise HttpError(422, "Description too short")
        if len(v) > 500:
            raise HttpError(422, "Description too long. Max: 500 characters")
        return v


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
    auth=uidkey_auth,
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
    name: str
    disease: str
    description: str
    repository: str
    implementation_language: str
    categorical: bool
    temporal: bool
    spatial: bool
    sprint: bool


@router.put(
    "/models/{model_id}",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    include_in_schema=False,
)
@csrf_exempt
def update_model(request, model_id: int, payload: UpdateModelForm = Form(...)):
    username, _ = request.headers.get("X-UID-Key").split(":")

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return 403, {"message": "Unauthorized. See Documentation"}

    try:
        model = Model.objects.get(pk=model_id)
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}

    if not user.is_staff:
        if user != model.author.user:
            return 403, {
                "message": "You are not authorized to update this Model"
            }

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


@router.delete(
    "/models/{model_id}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    tags=["registry", "models"],
)
@csrf_exempt
def delete_model(request, model_id: int):
    username, _ = request.headers.get("X-UID-Key").split(":")

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return 403, {"message": "Unauthorized. See Documentation"}

    try:
        model = Model.objects.get(pk=model_id)

        if not user.is_staff:
            if user != model.author.user:
                return 403, {
                    "message": "You are not authorized to delete this Model"
                }

        if calling_via_swagger(request):
            return 200, {
                "message": "Success. Calling via Swagger, Model not deleted"
            }

        model.delete()
        return 200, {"message": f"Model {model.name} deleted successfully"}
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


class PagesPaginationLimited(PagesPagination):
    max_per_page: int = 30


@router.get(
    "/predictions/",
    response=List[PredictionOut],
    tags=["registry", "predictions"],
)
@paginate(PagesPaginationLimited)
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
        prediction = Prediction.objects.get(pk=predict_id)
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
    auth=uidkey_auth,
    tags=["registry", "predictions"],
)
@csrf_exempt
def create_prediction(request, payload: PredictionIn):
    model = Model.objects.get(pk=payload.model)

    if request.user != model.author.user:
        return 403, {"message": "You are not authorized to update this Model"}

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
            message="Calling via swagger. This Prediction has not been saved",
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
    prediction.message = "Prediction saved successfully"
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

        if not calling_via_swagger(request):
            # Not really required, since include_in_schema=False
            prediction.save()

        return 201, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.delete(
    "/predictions/{predict_id}",
    response={200: SuccessSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    tags=["registry", "predictions"],
)
@csrf_exempt
def delete_prediction(request, predict_id: int):
    username, _ = request.headers.get("X-UID-Key").split(":")

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return 403, {"message": "Unauthorized. See Documentation"}

    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if not user.is_staff:
            if user != prediction.model.author.user:
                return 403, {
                    "message": (
                        "You are not authorized to delete this prediction"
                    )
                }

        if calling_via_swagger(request):
            return 200, {
                "message": (
                    "Success. Calling via Swagger, Prediction not deleted"
                )
            }

        prediction.delete()
        return 200, {
            "message": f"Prediction {prediction.id} deleted successfully"
        }
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}
