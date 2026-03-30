import hashlib
import json
from collections import defaultdict
from typing import List
from urllib.parse import urlparse
from datetime import timedelta

import httpx
from django.contrib.auth import get_user_model
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, models
from django.core.files.base import ContentFile
from django.utils import timezone
from main.schema import (
    SuccessSchema,
    BadRequestSchema,
    NotFoundSchema,
    ForbiddenSchema,
    UnprocessableContentSchema,
    InternalErrorSchema,
)
from ninja import Router, Query
from ninja.pagination import paginate
from ninja.decorators import decorate_view
from ninja.errors import ValidationError
from users.auth import UidKeyAuth, JWTAuth, OptionalJWTAuth
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

        sprint_id = payload.sprint if payload.sprint != 0 else None

        model, created = m.RepositoryModel.objects.update_or_create(
            repository=repository,
            defaults={
                "time_resolution": payload.time_resolution,
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
    auth=OptionalJWTAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def models_thumbnails(request):
    user = request.auth
    perm = models.Q(repository__active=True)

    if user and user.is_authenticated:
        if user.is_superuser:
            perm = models.Q()
        else:
            perm |= (
                models.Q(repository__owner=user)
                | models.Q(
                    repository__organization__memberships__user=user,
                    repository__organization__memberships__role__in=[
                        "OWNER",
                        "ADMIN",
                    ],
                )
                | models.Q(
                    repository__repository_contributors__user=user,
                    repository__repository_contributors__permission="ADMIN",
                )
            )

    qs = (
        m.RepositoryModel.objects.filter(perm)
        .select_related(
            "repository",
            "repository__organization",
            "repository__owner",
        )
        .annotate(predictions_count=models.Count("predicts"))
        .filter(predictions_count__gt=0)
        .distinct()
        .order_by("-updated")
    )

    return list(qs)


@router.get(
    "/models/tags/",
    response=List[s.ModelTags],
    auth=OptionalJWTAuth(),
    include_in_schema=False,
)
def models_tags(request, ids: List[int] = Query(None)):
    user = request.auth

    repo_filter = models.Q(repository__active=True)

    if user and user.is_authenticated:
        if user.is_superuser:
            repo_filter = models.Q()
        else:
            repo_filter |= (
                models.Q(repository__owner=user)
                | models.Q(
                    repository__organization__memberships__user=user,
                    repository__organization__memberships__role__in=[
                        "OWNER",
                        "ADMIN",
                    ],
                )
                | models.Q(
                    repository__repository_contributors__user=user,
                    repository__repository_contributors__permission="ADMIN",
                )
            )

    qs = (
        m.RepositoryModel.objects.filter(repo_filter)
        .annotate(predictions_count=models.Count("predicts"))
        .filter(predictions_count__gt=0)
    )

    if ids:
        qs = qs.filter(id__in=ids)

    model_ids = qs.values_list("id", flat=True)
    tags_map = defaultdict(lambda: {"name": "", "models": set()})

    disease_data = (
        m.ModelPrediction.objects.filter(model_id__in=model_ids)
        .values("disease_id", "disease__code", "model_id")
        .distinct()
    )

    for item in disease_data:
        tag_id = f"dis_{item['disease_id']}"
        key = ("disease", tag_id)
        tags_map[key]["name"] = str(item["disease__code"])
        tags_map[key]["models"].add(item["model_id"])

    adm_data = (
        m.ModelPrediction.objects.filter(model_id__in=model_ids)
        .values("adm_level", "model_id")
        .distinct()
    )

    adm_choices = dict(m.ModelPrediction.AdministrativeLevel.choices)
    for item in adm_data:
        level = item["adm_level"]
        tag_id = f"adm_{level}"
        key = ("adm_level", tag_id)
        tags_map[key]["name"] = str(adm_choices.get(level, f"Level {level}"))
        tags_map[key]["models"].add(item["model_id"])

    other_fields = qs.values(
        "id", "category", "time_resolution", "sprint_id", "sprint__year"
    )

    for row in other_fields:
        mid = row["id"]
        if row["category"]:
            tag_id = f"cat_{row['category']}"
            key = ("model_category", tag_id)
            tags_map[key]["name"] = str(
                row["category"].replace("_", " ").title()
            )
            tags_map[key]["models"].add(mid)

        if row["time_resolution"]:
            tag_id = f"per_{row['time_resolution']}"
            key = ("periodicity", tag_id)
            tags_map[key]["name"] = str(row["time_resolution"].title())
            tags_map[key]["models"].add(mid)

        if row["sprint_id"]:
            tag_id = f"spr_{row['sprint_id']}"
            key = ("IMDC", tag_id)
            tags_map[key]["name"] = (
                str(row["sprint__year"])
                if row["sprint__year"]
                else str(row["sprint_id"])
            )
            tags_map[key]["models"].add(mid)

    result = [
        {
            "id": tag_id,
            "name": data["name"],
            "category": cat,
            "models": [{"id": mid} for mid in data["models"]],
        }
        for (cat, tag_id), data in tags_map.items()
    ]

    return sorted(result, key=lambda x: (x["category"], x["name"]))


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
    auth=OptionalJWTAuth(),
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
            )
            .prefetch_related("repository__repository_contributors__user")
            .annotate(predictions=models.Count("predicts"))
            .get(query)
        )
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    if not model.active:
        perms = repository_permissions(request, owner, repository)
        if not perms.can_manage:
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

    if not provider_cls:
        return 404, {"message": "No OAuth provider found"}

    provider = provider_cls(request)

    token_holder = repo.owner

    if not token_holder:
        admin = m.RepositoryContributor.objects.filter(
            repository=repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        ).first()
        if admin:
            token_holder = admin.user

    if not token_holder:
        return 404, {"message": "Repository admin inaccessible"}

    oauth_account = token_holder.oauth_accounts.filter(
        provider=repo.provider
    ).first()

    if oauth_account:
        try:
            if (
                oauth_account.access_token_expires_at
                and oauth_account.access_token_expires_at
                < (timezone.now() + timedelta(minutes=5))
            ):
                refresh_data = provider.refresh_access_token(
                    refresh_token=oauth_account.refresh_token
                )

                oauth_account.access_token = refresh_data["access_token"]
                oauth_account.refresh_token = refresh_data.get(
                    "refresh_token", oauth_account.refresh_token
                )

                expires_in = refresh_data.get("expires_in")

                if expires_in:
                    oauth_account.access_token_expires_at = (
                        timezone.now() + timedelta(seconds=expires_in)
                    )

                with transaction.atomic():
                    oauth_account.save()

            content = provider.get_readme(repo, oauth_account)

        except Exception:
            content = None

    if not content and repo.provider == "github":
        try:
            url = f"https://api.github.com/repos/{owner}/{repository}/readme"

            headers = {
                "Accept": "application/vnd.github.raw",
                "X-GitHub-Api-Version": "2022-11-28",
            }

            with httpx.Client(timeout=10) as client:
                resp = client.get(url, headers=headers)

                if resp.status_code == 200:
                    content = resp.text

        except Exception:
            content = None

    if not content and repo.provider == "github":
        branches = ["main", "master"]

        try:
            with httpx.Client(timeout=10) as client:
                for branch in branches:
                    raw_url = (
                        "https://raw.githubusercontent.com/"
                        f"{owner}/{repository}/{branch}/README.md"
                    )

                    resp = client.get(raw_url)

                    if resp.status_code == 200:
                        content = resp.text
                        break

        except Exception:
            content = None

    if not content:
        return 404, {"message": "README not found or inaccessible"}

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

    quantitative_types = [
        m.RepositoryModel.Category.QUANTITATIVE,
        m.RepositoryModel.Category.SPATIAL_QUANTITATIVE,
        m.RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
    ]
    categorical_types = [
        m.RepositoryModel.Category.CATEGORICAL,
        m.RepositoryModel.Category.SPATIAL_CATEGORICAL,
        m.RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
    ]

    predictions = (
        m.ModelPrediction.objects.filter(model=model)
        .select_related(
            "model__repository",
            "model__sprint",
            "disease",
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
            category_group=models.Case(
                models.When(
                    model__category__in=quantitative_types,
                    then=models.Value("quantitative"),
                ),
                models.When(
                    model__category__in=categorical_types,
                    then=models.Value("categorical"),
                ),
                default=models.F("model__category"),
                output_field=models.CharField(),
            ),
        )
        .order_by("-created_at")
    )

    for p in predictions:
        p.category = p.category_group

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


@router.patch(
    "/prediction/{prediction_id}/publish/",
    response={201: str, 403: dict, 404: dict},
    auth=UidKeyAuth(),
    include_in_schema=True,
)
def prediction_published(
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


@router.patch(
    "/model/{owner}/{repository}/",
    auth=JWTAuth(),
    response={
        201: SuccessSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
        400: BadRequestSchema,
    },
    include_in_schema=False,
)
def model_update(
    request,
    owner: str,
    repository: str,
    active: bool = None,
    description: str = None,
):
    perms_response = repository_permissions(request, owner, repository)

    if isinstance(perms_response, tuple):
        status_code, data = perms_response
        return status_code, data

    if not perms_response.get("can_manage"):
        return 403, {
            "message": "You do not have permission to manage this model"
        }

    try:
        query = models.Q(repository__name=repository) & (
            models.Q(repository__organization__name=owner)
            | models.Q(repository__owner__username=owner)
        )
        model = m.RepositoryModel.objects.get(query)

        if active is not None:
            model.active = active

        if description is not None:
            model.description = description

        model.save()

        return 201, {"message": "ok"}
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": "Model not found"}


@router.delete(
    "/model/{owner}/{repository}/",
    auth=JWTAuth(),
    response={
        200: SuccessSchema,
        403: ForbiddenSchema,
        404: NotFoundSchema,
    },
    include_in_schema=False,
)
def model_delete(request, owner: str, repository: str):
    perms_response = repository_permissions(request, owner, repository)

    if isinstance(perms_response, tuple):
        status_code, data = perms_response
        return status_code, data

    if not perms_response.get("can_manage"):
        return 403, {
            "message": "You do not have permission to delete this model"
        }

    try:
        query = models.Q(repository__name=repository) & (
            models.Q(repository__organization__name=owner)
            | models.Q(repository__owner__username=owner)
        )
        model = m.RepositoryModel.objects.get(query)
        model.delete()
        return 200, {"message": "Model deleted successfully"}
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": "Model not found"}


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
        )
    else:
        qs = qs.filter(repository__active=True)
    return qs.order_by("-updated").distinct()


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
    qs = m.ModelPrediction.objects.select_related(
        "disease",
        "model",
        "adm0",
        "adm1",
        "adm2",
        "adm3",
        "quantitativeprediction",
    ).all()

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
        )
    else:
        qs = qs.filter(published=True, model__repository__active=True)

    return qs.distinct()


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
def create_prediction(request, data: s.PredictionIn):
    user = request.auth
    repo_owner, repo_name = data.repository.strip("/").split("/", 1)

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
        return 422, {"message": f"Repository '{data.repository}' not found."}

    try:
        disease_obj = m.Disease.objects.get(code__iexact=data.disease)
    except m.Disease.DoesNotExist:
        return 422, {"message": f"Disease code '{data.disease}' not found."}

    if model.sprint and data.case_definition == "reported":
        return 422, {
            "message": "Predictions for IMDC Sprint must use probable cases"
        }

    try:
        data = s.PredictionIn.model_validate(
            data,
            context={
                "time_resolution": model.time_resolution,
                "is_sprint": model.sprint is not None,
            },
        )
    except ValidationError as e:
        return 422, {"message": e.errors()}

    incoming_preds = [row.pred for row in data.prediction]
    incoming_hash = hashlib.sha256(
        json.dumps(incoming_preds).encode()
    ).hexdigest()

    existing_predictions = m.QuantitativePrediction.objects.filter(
        model=model
    ).prefetch_related("data")

    for pred in existing_predictions:
        existing_preds = list(
            pred.data.values_list("pred", flat=True).order_by("date")
        )
        existing_hash = hashlib.sha256(
            json.dumps(existing_preds).encode()
        ).hexdigest()

        if incoming_hash == existing_hash:
            return 422, {
                "message": (
                    "Duplication found for this Prediction within the Model"
                )
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
                "message": (
                    "You do not have write permission for this repository."
                )
            },
        )

    adms = {"adm0": None, "adm1": None, "adm2": None, "adm3": None}

    try:
        if data.adm_level == 0:
            adms["adm0"] = m.Adm0.objects.get(geocode=data.adm_0)

        elif data.adm_level == 1:
            adms["adm1"] = m.Adm1.objects.get(
                geocode=data.adm_1, country__geocode=data.adm_0
            )
            adms["adm0"] = adms["adm1"].country

        elif data.adm_level == 2:
            adms["adm2"] = m.Adm2.objects.get(
                geocode=data.adm_2,
                adm1__geocode=data.adm_1,
                adm1__country__geocode=data.adm_0,
            )
            adms["adm1"] = adms["adm2"].adm1
            adms["adm0"] = adms["adm1"].country

        elif data.adm_level == 3:
            adms["adm3"] = m.Adm3.objects.get(
                geocode=data.adm_3,
                adm2__geocode=data.adm_2,
                adm2__adm1__geocode=data.adm_1,
                adm2__adm1__country__geocode=data.adm_0,
            )
            adms["adm2"] = adms["adm3"].adm2
            adms["adm1"] = adms["adm2"].adm1
            adms["adm0"] = adms["adm1"].country

    except (m.Adm0.DoesNotExist,):
        return 422, {"message": f"adm_0 {data.adm_0} not found"}
    except (m.Adm1.DoesNotExist,):
        return 422, {"message": f"adm_1 {data.adm_1} - {data.adm_0} not found"}
    except (m.Adm2.DoesNotExist,):
        return 422, {
            "message": (
                f"adm_2 {data.adm_2} - {data.adm_1} - {data.adm_0} not found"
            )
        }
    except (m.Adm3.DoesNotExist,):
        return 422, {
            "message": (f"adm_3 {data.adm_3} not found for specified city")
        }

    prediction = m.QuantitativePrediction(
        model=model,
        disease=disease_obj,
        commit=data.commit,
        description=data.description,
        case_definition=data.case_definition,
        published=data.published,
        adm_level=data.adm_level,
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
        for row in data.prediction
    ]

    if not calling_via_swagger(request):
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
