from collections import defaultdict
from typing import List
from urllib.parse import urlparse

import httpx
from django.contrib.auth import get_user_model
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, models
from django.core.files.base import ContentFile
from main.schema import (
    BadRequestSchema,
    NotFoundSchema,
    ForbiddenSchema,
    UnprocessableContentSchema,
    InternalErrorSchema,
)
from ninja import Router, Query
from ninja.pagination import paginate
from ninja.decorators import decorate_view
from users.auth import UidKeyAuth, JWTAuth
from users.providers import GithubProvider, GitlabProvider

from .utils import calling_via_swagger
from . import schema as s
from . import models as m
from .pagination import PagesPagination
from .filters import PredictionFilterSchema, ModelFilterSchema


router = Router(tags=["registry"])
User = get_user_model()


@router.get(
    "/model/add/sprint/actives/",
    auth=JWTAuth(),
    response=List[s.SprintOut],
    include_in_schema=False,
)
def is_sprint_active(request):
    return m.Sprint.objects.all()


@router.post(
    "/model/add/",
    auth=JWTAuth(),
    response={201: dict, 400: BadRequestSchema},
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

        sprint_id = payload.sprint if payload.sprint != 0 else None

        model, created = m.RepositoryModel.objects.update_or_create(
            repository=repository,
            defaults={
                "disease": disease,
                "time_resolution": payload.time_resolution,
                "adm_level": payload.adm_level,
                "category": payload.category,
                "sprint_id": sprint_id,
            },
        )

        if payload.repo_avatar_url:
            try:
                with httpx.Client() as client:
                    response = client.get(payload.repo_avatar_url, timeout=5)
                    if response.status_code == 200:
                        ext = "png"
                        if "jpeg" in response.headers.get("content-type", ""):
                            ext = "jpg"

                        img = (
                            f"{repository.provider}_{repository.repo_id}.{ext}"
                        )

                        model.avatar.save(
                            img, ContentFile(response.content), save=True
                        )
            except (httpx.RequestError, httpx.TimeoutException):
                pass

    return 201, {
        "success": True,
        "model_id": model.id,
        "action": "created" if created else "updated",
    }


@router.get(
    "/models/thumbnails/",
    response=List[s.ModelThumbs],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def models_thumbnails(request):
    repo_models = (
        m.RepositoryModel.objects.select_related(
            "repository",
            "repository__organization",
            "repository__owner",
            "disease",
        )
        .annotate(predictions_count=models.Count("predicts"))
        .filter(predictions_count__gt=0)
        .all()
    )
    return repo_models.order_by("-updated")


@router.get(
    "/models/tags/",
    response=List[s.ModelTags],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def models_tags(request, ids: List[int] = Query(None)):
    qs = (
        m.RepositoryModel.objects.select_related("disease")
        .annotate(predictions_count=models.Count("predicts"))
        .filter(predictions_count__gt=0)
        .all()
    )

    if ids:
        qs = qs.filter(id__in=ids)

    tags_map = defaultdict(lambda: {"name": "", "models": set()})

    for model in qs:
        if model.disease:
            key = ("disease", str(model.disease.id))
            tags_map[key]["name"] = str(model.disease)
            tags_map[key]["models"].add(model.id)

        if model.adm_level is not None:
            key = ("adm_level", str(model.adm_level))
            tags_map[key]["name"] = model.get_adm_level_display()
            tags_map[key]["models"].add(model.id)

        if model.category:
            key = ("model_category", str(model.category))
            tags_map[key]["name"] = model.get_category_display()
            tags_map[key]["models"].add(model.id)

        if model.time_resolution:
            key = ("periodicity", str(model.time_resolution))
            tags_map[key]["name"] = model.get_time_resolution_display()
            tags_map[key]["models"].add(model.id)

        if model.sprint_id:
            key = ("IMDC", str(model.sprint_id))
            tags_map[key]["name"] = (
                str(model.sprint.year)
                if model.sprint
                else f"{model.sprint_id}"
            )
            tags_map[key]["models"].add(model.id)

    response_data = []
    for (category, tag_id), data in tags_map.items():
        response_data.append(
            {
                "id": tag_id,
                "name": data["name"],
                "category": category,
                "models": [{"id": mid} for mid in data["models"]],
            }
        )

    return sorted(response_data, key=lambda x: (x["category"], x["name"]))


@router.get(
    "/model/{owner}/",
    auth=UidKeyAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_owner(request, owner: str):
    return {"owner": owner}


@router.get(
    "/model/{owner}/{repository}/",
    response={200: s.ModelOut, 404: NotFoundSchema},
    auth=UidKeyAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_model(request, owner: str, repository: str):
    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = (
            m.RepositoryModel.objects.select_related(
                "repository",
                "repository__organization",
                "repository__owner",
                "disease",
            )
            .prefetch_related("repository__repository_contributors__user")
            .annotate(predictions=models.Count("predicts"))
            .get(query)
        )
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    return model


@router.patch(
    "/model/{owner}/{repository}/description/",
    response={200: str, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=JWTAuth(),
    include_in_schema=False,
)
def update_repository_model_description(
    request, owner: str, repository: str, payload: s.ModelDescriptionIn
):
    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = m.RepositoryModel.objects.select_related(
            "repository__owner", "repository__organization"
        ).get(query)
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    user = request.auth
    repo = model.repository

    is_owner = repo.owner == user
    is_contributor = repo.repository_contributors.filter(user=user).exists()

    if not (is_owner or is_contributor or user.is_superuser):
        return 403, {
            "message": "You do not have permission to edit this model."
        }

    model.description = payload.description
    model.save()

    return 200, "ok"


@router.get(
    "/model/{owner}/{repository}/readme/",
    response={200: dict, 404: NotFoundSchema},
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def repository_readme(request, owner: str, repository: str):
    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = m.RepositoryModel.objects.select_related(
            "repository",
            "repository__organization",
            "repository__owner",
        ).get(query)
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    repo = model.repository
    content = None

    provider_cls = {
        "github": GithubProvider,
        "gitlab": GitlabProvider,
    }.get(repo.provider)

    if provider_cls:
        provider = provider_cls(request)
        access_token = None
        token_holder = repo.owner

        if not token_holder:
            admin = m.RepositoryContributor.objects.filter(
                repository=repo,
                permission=m.RepositoryContributor.Permissions.ADMIN,
            ).first()
            if admin:
                token_holder = admin.user

        if token_holder:
            oauth_account = token_holder.oauth_accounts.filter(
                provider=repo.provider
            ).first()
            if oauth_account:
                access_token = oauth_account.access_token

        content = provider.get_readme(repo, access_token=access_token)

    if not content:
        return 404, {"message": "README not found or inaccessible."}

    return 200, {"content": content}


@router.get(
    "/model/{owner}/{repository}/predictions/",
    response={200: list[s.ModelPredictionOut], 404: NotFoundSchema},
    auth=UidKeyAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_predictions(request, owner: str, repository: str):
    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = m.RepositoryModel.objects.get(query)
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    predictions = (
        m.ModelPrediction.objects.filter(model=model)
        .select_related(
            "model__repository",
            "model__sprint",
            "model__disease",
            "adm0",
            "adm1",
            "adm2",
            "adm3",
            "quantitativeprediction",
        )
        .annotate(
            start=models.Min("quantitativeprediction__data__date"),
            end=models.Max("quantitativeprediction__data__date"),
            mae_score=models.F("quantitativeprediction__mae_score"),
            mse_score=models.F("quantitativeprediction__mse_score"),
            crps_score=models.F("quantitativeprediction__crps_score"),
            log_score=models.F("quantitativeprediction__log_score"),
            interval_score=models.F("quantitativeprediction__interval_score"),
            wis_score=models.F("quantitativeprediction__wis_score"),
        )
        .order_by("-created_at")
    )

    return predictions


@router.get(
    "/model/{owner}/{repository}/permissions/",
    response=s.RepositoryPermissions,
    auth=JWTAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_permissions(request, owner: str, repository: str):
    user = request.auth

    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = m.RepositoryModel.objects.select_related(
            "repository__owner", "repository__organization"
        ).get(query)
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": "Repository not found"}

    repo = model.repository
    is_owner = False
    can_manage = False

    if user.is_superuser:
        can_manage = True

    if repo.owner and repo.owner == user:
        is_owner = True
        can_manage = True

    elif repo.organization:
        membership = repo.organization.members.filter(user=user).first()
        if membership and membership.role in ["OWNER", "ADMIN"]:
            can_manage = True

    if not can_manage:
        is_admin = m.RepositoryContributor.objects.filter(
            repository=repo, user=user, permission="ADMIN"
        ).exists()
        if is_admin:
            can_manage = True

    return {"is_owner": is_owner, "can_manage": can_manage}


@router.patch(
    "/prediction/{prediction_id}/published/",
    response={201: str, 403: dict, 404: dict},
    auth=JWTAuth(),
    include_in_schema=False,
)
def update_prediction_published(
    request,
    prediction_id: int,
    payload: s.PredictionPublishUpdateIn,
):
    try:
        prediction = m.ModelPrediction.objects.select_related(
            "model__repository__owner", "model__repository__organization"
        ).get(id=prediction_id)
    except m.ModelPrediction.DoesNotExist:
        return 404, {"message": "Prediction not found"}

    user = request.auth
    repo = prediction.model.repository

    is_authorized = (
        repo.owner == user
        or repo.repository_contributors.filter(user=user).exists()
        or user.is_superuser
    )

    if not is_authorized:
        return 403, {"message": "Permission denied"}

    prediction.published = payload.published
    prediction.save()

    return 201, "ok"


@router.get(
    "/models/{owner}/{repository}/",
    response={
        200: s.Model,
        404: NotFoundSchema,
    },
    auth=UidKeyAuth(),
    include_in_schema=True,
)
@decorate_view(never_cache)
def get_model(request, owner: str, repository: str):
    user = request.auth
    qs = m.RepositoryModel.objects.annotate(
        predictions_count=models.Count("predicts")
    ).filter(
        models.Q(repository__owner__username=owner)
        | models.Q(repository__organization__name=owner),
        repository__name=repository,
    )

    if user and (user.is_superuser or user.is_staff):
        pass
    elif user:
        qs = qs.filter(
            models.Q(repository__active=True)
            | models.Q(repository__repository_contributors__user=user)
        ).distinct()
    else:
        qs = qs.filter(repository__active=True)

    model = qs.first()

    if not model:
        return 404, {
            "message": (
                f"Model '{owner}/{repository}' not found or missing permissions"
            )
        }

    return model


@router.get(
    "/models/",
    response=List[s.Model],
    auth=UidKeyAuth(),
    include_in_schema=True,
)
@paginate(PagesPagination)
@decorate_view(never_cache)
def list_models(
    request,
    filters: ModelFilterSchema = Query(...),
):
    user = request.auth
    qs = m.RepositoryModel.objects.annotate(
        predictions_count=models.Count("predicts")
    ).all()
    qs = filters.filter(qs)

    if user and (user.is_superuser or user.is_staff):
        pass
    elif user:
        qs = qs.filter(
            models.Q(repository__active=True)
            | models.Q(repository__repository_contributors__user=user)
        ).distinct()
    else:
        qs = qs.filter(repository__active=True)
    return list(qs.order_by("-updated"))


@router.get(
    "/predictions/",
    response=List[s.Prediction],
    auth=UidKeyAuth(),
    include_in_schema=True,
)
@paginate(PagesPagination)
@decorate_view(never_cache)
def list_predictions(
    request,
    filters: PredictionFilterSchema = Query(...),
):
    user = request.auth
    qs = m.ModelPrediction.objects.all()
    qs = filters.filter(qs)
    qs = qs.annotate(
        start_date=models.Min("quantitativeprediction__data__date"),
        end_date=models.Max("quantitativeprediction__data__date"),
    )

    if user and (user.is_superuser or user.is_staff):
        pass
    elif user:
        qs = qs.filter(
            models.Q(model__repository__repository_contributors__user=user)
            | (
                models.Q(published=True)
                & models.Q(model__repository__active=True)
            )
        ).distinct()
    else:
        qs = qs.filter(published=True, model__repository__active=True)

    return qs


@router.post(
    "/predictions/",
    response={
        201: s.CreatePredictionOut,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        422: UnprocessableContentSchema,
        500: InternalErrorSchema,
    },
    auth=UidKeyAuth(),
    include_in_schema=True,
)
@decorate_view(csrf_exempt)
def create_prediction(request, payload: s.PredictionIn):
    user = request.auth
    repo_owner, repo_name = payload.repository.strip("/").split("/", 1)

    model = (
        m.RepositoryModel.objects.select_related(
            "repository", "repository__owner", "repository__organization"
        )
        .filter(repository__name=repo_name)
        .filter(
            models.Q(repository__owner__username__iexact=repo_owner)
            | models.Q(repository__organization__name__iexact=repo_owner)
        )
        .first()
    )

    if not model:
        return 422, {
            "message": f"Repository '{payload.repository}' not found."
        }

    if model.sprint and payload.case_definition == "reported":
        return 422, {
            "message": "Predictions for IMDC Sprint must use probable cases"
        }

    repo = model.repository
    has_permission = False

    if repo.owner == user:
        has_permission = True

    elif repo.organization:
        is_org_admin = m.OrganizationMembership.objects.filter(
            organization=repo.organization,
            user=user,
            role__in=[
                m.OrganizationMembership.Roles.OWNER,
                m.OrganizationMembership.Roles.MAINTAINER,
            ],
        ).exists()
        if is_org_admin:
            has_permission = True

    if not has_permission:
        is_contributor = m.RepositoryContributor.objects.filter(
            repository=repo,
            user=user,
            permission__in=[
                m.RepositoryContributor.Permissions.ADMIN,
                m.RepositoryContributor.Permissions.WRITE,
            ],
        ).exists()
        if is_contributor:
            has_permission = True

    if not has_permission:
        return (
            403,
            {
                "message": "You do not have write permission for this repository."
            },
        )

    adms = {"adm0": None, "adm1": None, "adm2": None, "adm3": None}

    adm_config = {
        m.RepositoryModel.AdministrativeLevel.NATIONAL: (
            m.Adm0,
            "adm_0",
            "adm0",
        ),
        m.RepositoryModel.AdministrativeLevel.STATE: (m.Adm1, "adm_1", "adm1"),
        m.RepositoryModel.AdministrativeLevel.MUNICIPALITY: (
            m.Adm2,
            "adm_2",
            "adm2",
        ),
        m.RepositoryModel.AdministrativeLevel.SUB_MUNICIPALITY: (
            m.Adm3,
            "adm_3",
            "adm3",
        ),
    }

    config = adm_config.get(model.adm_level)

    if not config:
        return 500, {
            "message": (
                "Server Error: Unknown administrative "
                f"level find in Model '{model.adm_level}'"
            )
        }

    Adm, payload_adm, db_field = config
    geocode = getattr(payload, payload_adm)

    if not geocode:
        return 422, {
            "message": (
                f"Model requires administrative level {model.adm_level},"
                f" but '{payload_adm}' is missing or empty."
            )
        }

    try:
        adms[db_field] = Adm.objects.get(pk=geocode)
    except Adm.DoesNotExist:
        return 422, {
            "message": (
                f"Administrative unit '{geocode}' "
                f"not found in {Adm._meta.verbose_name}."
            )
        }

    prediction = m.QuantitativePrediction(
        model=model,
        commit=payload.commit,
        description=payload.description,
        predict_date=payload.predict_date,
        case_definition=payload.case_definition,
        published=payload.published,
        **adms,
    )

    rows = [
        m.QuantitativePredictionRow(
            prediction=prediction,
            date=row.date,
            pred=row.pred,
            lower_95=row.lower_95,
            lower_90=row.lower_90,
            lower_80=row.lower_80,
            lower_50=row.lower_50,
            upper_50=row.upper_50,
            upper_80=row.upper_80,
            upper_90=row.upper_90,
            upper_95=row.upper_95,
        )
        for row in payload.prediction
    ]

    if not calling_via_swagger(request):
        prediction.parse_metadata()
        prediction.save()
        m.QuantitativePredictionRow.objects.bulk_create(rows)
    else:
        prediction.id = 0

    return 201, {"id": prediction.id}


@router.get(
    "/predictions/{id}/",
    response={200: s.PredictionDetail, 404: NotFoundSchema},
    auth=UidKeyAuth(),
    include_in_schema=True,
)
def get_prediction(request, id: int):
    user = request.auth

    qs = (
        m.QuantitativePrediction.objects.filter(id=id)
        .select_related(
            "model", "model__repository", "adm0", "adm1", "adm2", "adm3"
        )
        .prefetch_related("data")
    )

    if user and (user.is_superuser or user.is_staff):
        pass
    elif user:
        qs = qs.filter(
            models.Q(model__repository__repository_contributors__user=user)
            | (
                models.Q(published=True)
                & models.Q(model__repository__active=True)
            )
        ).distinct()
    else:
        qs = qs.filter(published=True, model__repository__active=True)

    prediction = qs.first()

    if not prediction:
        return 404, {"message": f"Prediction '{id}' not found"}

    return prediction


@router.delete(
    "/predictions/{id}/",
    response={
        200: dict,
        403: ForbiddenSchema,
        404: NotFoundSchema,
    },
    auth=UidKeyAuth(),
    include_in_schema=True,
)
@decorate_view(csrf_exempt)
def delete_prediction(request, id: int):
    user = request.auth

    try:
        prediction = m.ModelPrediction.objects.get(id=id)
    except m.ModelPrediction.DoesNotExist:
        return 404, {"message": f"Prediction '{id}' not found"}

    repo = prediction.model.repository
    has_permission = False

    if user.is_superuser:
        has_permission = True

    if repo.owner == user:
        has_permission = True

    elif repo.organization:
        is_org_admin = m.OrganizationMembership.objects.filter(
            organization=repo.organization,
            user=user,
            role__in=[
                m.OrganizationMembership.Roles.OWNER,
                m.OrganizationMembership.Roles.MAINTAINER,
            ],
        ).exists()
        if is_org_admin:
            has_permission = True

    if not has_permission:
        is_contributor = m.RepositoryContributor.objects.filter(
            repository=repo,
            user=user,
            permission__in=[
                m.RepositoryContributor.Permissions.ADMIN,
                m.RepositoryContributor.Permissions.WRITE,
            ],
        ).exists()
        if is_contributor:
            has_permission = True

    if not has_permission:
        return 403, {
            "message": "You do not have permission to delete this prediction."
        }

    prediction.delete()
    return 200, {"message": f"Prediction {id} deleted successfully."}


@router.get(
    "/predictions/{id}/data/",
    response={200: list[s.PredictionData], 404: NotFoundSchema},
    auth=UidKeyAuth(),
)
def get_prediction_data(request, id: int):
    user = request.auth
    qs = m.QuantitativePrediction.objects.filter(id=id)

    if user and (user.is_superuser or user.is_staff):
        pass
    elif user:
        qs = qs.filter(
            models.Q(model__repository__repository_contributors__user=user)
            | (
                models.Q(published=True)
                & models.Q(model__repository__active=True)
            )
        )
    else:
        qs = qs.filter(published=True, model__repository__active=True)

    prediction = qs.first()

    if not prediction:
        return 404, {"message": f"Prediction '{id}' not found"}

    return prediction.data.all().order_by("date")
