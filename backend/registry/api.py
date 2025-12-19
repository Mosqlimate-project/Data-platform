from typing import List, Literal
from typing_extensions import Annotated
from urllib.parse import urlparse

import pandas as pd
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Count
from django.forms import Form
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, models
from main.schema import (
    BadRequestSchema,
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

from main.models import APILog
from users.auth import UidKeyAuth, JWTAuth
from .models import Model, Prediction
from .pagination import PagesPagination
from . import schema as s
from . import models as m
from .utils import calling_via_swagger
from vis.brasil.models import State, City
from vis.tasks import calculate_score

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
    "/authors/",
    response=List[s.AuthorSchema],
    auth=uidkey_auth,
    tags=["registry", "authors"],
)
@csrf_exempt
@paginate(PagesPagination)
def list_authors(
    request,
    filters: s.AuthorFilterSchema = Query(...),
):
    """
    Lists all authors, can be filtered by name.
    Authors that don't have any Model won't be listed
    """
    if not calling_via_swagger(request):
        APILog.from_request(request)
    models_count = m.Author.objects.annotate(num_models=Count("model"))
    authors = models_count.filter(num_models__gt=0)
    return filters.filter(authors).order_by("-updated")


@router.get(
    "/authors/{username}",
    response={200: s.AuthorSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    tags=["registry", "authors"],
)
@csrf_exempt
def get_author(request, username: str):
    """Gets author by Github username"""
    if not calling_via_swagger(request):
        APILog.from_request(request)
    try:
        author = m.Author.objects.get(user__username=username)
        return 200, author
    except m.Author.DoesNotExist:
        return 404, {"message": "Author not found"}


@router.put(
    "/authors/{username}",
    response={201: s.AuthorSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
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
        author = m.Author.objects.get(user__username=username)

        if request.user != author.user:  # TODO: Enable admins here
            return 403, {
                "message": "You are not authorized to update this author"
            }

        author.institution = payload.institution

        if not calling_via_swagger(request):
            APILog.from_request(request)
            # Not really required, since include_in_schema=False
            author.save()

        return 201, author
    except m.Author.DoesNotExist:
        return 404, {"message": "Author not found"}


# [Model] Model
class ModelIn(Schema):
    name: Annotated[str, Field(description="Model name")]
    description: Annotated[str, Field(description="Model description")]
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
    adm_level: Annotated[
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
        if len(v) == 0:
            raise HttpError(422, "Description too short")
        if len(v) > 500:
            raise HttpError(422, "Description too long. Max: 500 characters")
        return v


@router.get(
    "/models/",
    response=List[s.ModelSchema],
    auth=uidkey_auth,
    tags=["registry", "models"],
)
@paginate(PagesPagination)
@csrf_exempt
def list_models(
    request,
    filters: s.ModelFilterSchema = Query(...),
    **kwargs,
):
    if not calling_via_swagger(request):
        APILog.from_request(request)
    models = Model.objects.all()
    models = filters.filter(models)
    return models.order_by("-updated")


@router.get(
    "/models/{model_id}",
    response={200: s.ModelSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    tags=["registry", "models"],
)
@csrf_exempt
def get_model(request, model_id: int):
    if not calling_via_swagger(request):
        APILog.from_request(request)
    try:
        model = Model.objects.get(pk=model_id)  # TODO: get model by id?
        return 200, model
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.post(
    "/models/",
    response={
        201: s.ModelSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        422: UnprocessableContentSchema,
    },
    auth=uidkey_auth,
    tags=["registry", "models"],
)
@csrf_exempt
def create_model(request, payload: ModelIn):
    user = request.auth
    author = m.Author.objects.get(user=user)

    if Model.objects.filter(name__iexact=payload.name).exists():
        return 403, {"message": f"Model '{payload.name}' already exists"}

    data = payload.dict()
    data["implementation_language"] = m.ImplementationLanguage.objects.get(
        language__iexact=payload.implementation_language
    )

    model = Model(author=author, **data)

    if not calling_via_swagger(request):
        APILog.from_request(request)
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
    response={201: s.ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=uidkey_auth,
    include_in_schema=False,
)
@csrf_exempt
def update_model(request, model_id: int, payload: UpdateModelForm = Form(...)):
    user = request.auth

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
                lang = m.ImplementationLanguage.objects.get(
                    language__iexact=value
                )
                value = lang
            except m.ImplementationLanguage.DoesNotExist:
                similar_lang = m.ImplementationLanguage.objects.filter(
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
        APILog.from_request(request)
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
    user = request.auth

    try:
        model = Model.objects.get(pk=model_id)

        if model.sprint:
            return 403, {
                "message": "Models for Sprint 2024/25 can't be deleted"
            }

        if not user.is_staff:
            if user != model.author.user:
                return 403, {
                    "message": "You are not authorized to delete this Model"
                }

        if calling_via_swagger(request):
            return 200, {
                "message": "Success. Calling via Swagger, Model not deleted"
            }

        APILog.from_request(request)
        model.delete()
        return 200, {"message": f"Model '{model.name}' deleted successfully"}
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}


class PagesPaginationLimited(PagesPagination):
    max_per_page: int = 30


@router.get(
    "/predictions/",
    response=List[s.PredictionOut],
    auth=uidkey_auth,
    tags=["registry", "predictions"],
)
@paginate(PagesPaginationLimited)
@csrf_exempt
def list_predictions(
    request,
    filters: s.PredictionFilterSchema = Query(...),
    **kwargs,
):
    if not calling_via_swagger(request):
        APILog.from_request(request)
    predictions = Prediction.objects.filter(published=True)
    predictions = filters.filter(predictions)
    return predictions.order_by("-updated")


@router.get(
    "/predictions/{predict_id}",
    response={200: s.PredictionOut, 404: NotFoundSchema},
    auth=uidkey_auth,
    tags=["registry", "predictions"],
)
@csrf_exempt
def get_prediction(request, predict_id: int):
    if not calling_via_swagger(request):
        APILog.from_request(request)
    try:
        prediction = Prediction.objects.get(pk=predict_id)
        return 200, prediction
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}


@router.post(
    "/predictions/",
    response={
        201: s.PredictionOut,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        422: UnprocessableContentSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
    tags=["registry", "predictions"],
)
@csrf_exempt
def create_prediction(request, payload: s.PredictionIn):
    model = Model.objects.get(pk=payload.model)

    user = request.auth
    author = m.Author.objects.get(user__username=user.username)

    if author.user != model.author.user:
        return 403, {"message": "You are not authorized to update this Model"}

    def parse_data(predict: Prediction, data: List[dict]):
        if not calling_via_swagger(request):
            for row in data:
                m.PredictionDataRow.objects.get_or_create(
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
        adm_1 = State.objects.get(uf=payload.adm_1)
        adm_2 = None
    elif payload.adm_2:
        adm_1 = None
        adm_2 = City.objects.get(geocode=str(payload.adm_2))
    else:
        adm_1 = None
        adm_2 = None
        raise NotImplementedError()

    df = pd.DataFrame(data=[r.dict() for r in payload.prediction])

    prediction = Prediction(
        model=model,
        description=payload.description,
        commit=payload.commit,
        predict_date=payload.predict_date,
        adm_1=adm_1 or None,
        adm_2=adm_2 or None,
        date_ini_prediction=min(df.date),
        date_end_prediction=max(df.date),
    )

    if calling_via_swagger(request):
        data = [s.PredictionDataRowOut(**r.dict()) for r in payload.prediction]
        return 201, s.PredictionOut(
            message="Calling via swagger. This Prediction has not been saved",
            id=None,
            model=model.id,
            description=prediction.description,
            commit=prediction.commit,
            predict_date=prediction.predict_date,
            adm_1=prediction.adm_1.uf,
            adm_2=int(prediction.adm_2.geocode),
            data=data,
        )

    APILog.from_request(request)
    prediction.save()

    try:
        scores = calculate_score(prediction.id)
    except Exception:
        prediction.delete()
        return 422, {"message": "Failed to calculate Scores"}

    prediction.mae = scores["mae"]
    prediction.mse = scores["mse"]
    prediction.crps = scores["crps"]
    prediction.log_score = scores["log_score"]
    prediction.interval_score = scores["interval_score"]
    prediction.wis = scores["wis"]

    prediction.save()
    prediction.message = "Prediction saved successfully"
    parse_data(prediction, [r.dict() for r in payload.prediction])
    return 201, prediction


@router.put(
    "/predictions/{predict_id}",
    response={
        201: s.PredictionSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
    },
    auth=django_auth,
    tags=["registry", "predictions"],
    include_in_schema=False,
)
def update_prediction(request, predict_id: int, payload: s.PredictionIn):
    try:
        prediction = Prediction.objects.get(pk=predict_id)

        if request.user != prediction.model.author.user:
            return 403, {
                "message": "You are not authorized to update this prediction"
            }

        for attr, value in payload.items():
            setattr(prediction, attr, value)

        if not calling_via_swagger(request):
            APILog.from_request(request)
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
    user = request.auth

    try:
        prediction = Prediction.objects.get(pk=predict_id)
    except Prediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}

    if not user.is_staff:
        if user != prediction.model.author.user:
            return 403, {
                "message": "You are not authorized to delete this prediction"
            }

    if calling_via_swagger(request):
        return 200, {
            "message": "Success. Calling via Swagger, Prediction not deleted"
        }

    APILog.from_request(request)
    prediction.delete()
    return 200, {"message": f"Prediction {prediction.id} deleted successfully"}


# ---


@router.post(
    "/model/add/",
    auth=JWTAuth(),
    response={201: dict, 400: BadRequestSchema},
    tags=["registry", "model-add", "frontend"],
    include_in_schema=False,
)
def model_add(request, payload: s.ModelIncludeInit):
    try:
        url = urlparse(payload.repo_url)
        path = url.path.strip("/").split("/")
        if len(path) < 2:
            raise ValueError
        repo_name = path[-1]
        owner_name = path[-2]
    except (IndexError, AttributeError, ValueError):
        return 400, {"message": "Invalid repository URL format."}

    with transaction.atomic():
        owner = None
        org = None

        if owner_name.lower() == request.auth.username.lower():
            owner = request.auth
        else:
            org, _ = m.Organization.objects.get_or_create(name=owner_name)
            m.OrganizationMembership.objects.get_or_create(
                user=request.user,
                organization=org,
                defaults={"role": m.OrganizationMembership.Roles.CONTRIBUTOR},
            )

        query_filter = models.Q(
            provider=payload.repo_provider, name__iexact=repo_name
        )
        if owner:
            query_filter &= models.Q(owner=owner)
        else:
            query_filter &= models.Q(organization=org)

        repository = m.Repository.objects.filter(query_filter).first()

        if repository:
            repository.repo_id = payload.repo_id
            repository.active = True
            repository.save()
        else:
            repository = m.Repository.objects.create(
                repo_id=payload.repo_id,
                name=repo_name,
                provider=payload.repo_provider,
                owner=owner,
                organization=org,
                active=True,
            )

        m.RepositoryContributor.objects.get_or_create(
            user=request.auth,
            repository=repository,
            defaults={"permission": m.RepositoryContributor.Permissions.ADMIN},
        )

        try:
            disease = m.Disease.objects.get(id=payload.disease_id)
        except m.Disease.DoesNotExist:
            return 400, {"message": "Unknown Disease."}

        model, created = m.RepositoryModel.objects.update_or_create(
            repository=repository,
            defaults={
                "disease": disease,
                "time_resolution": payload.time_resolution,
                "adm_level": payload.adm_level,
                "category": payload.category,
                "sprint": payload.sprint,
            },
        )

    return 201, {
        "success": True,
        "model_id": model.id,
        "action": "created" if created else "updated",
    }


@router.get(
    "/models/thumbnails/",
    response=List[s.ModelThumbs],
    auth=UidKeyAuth(),
    tags=["registry", "frontend"],
    include_in_schema=False,
)
def models_thumbnails(request):
    models = m.Model.objects.all()
    return models.order_by("-updated")
