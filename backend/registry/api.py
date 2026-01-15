from typing import List
from urllib.parse import urlparse

import httpx
from django.contrib.auth import get_user_model
from django.views.decorators.cache import never_cache
from django.db import transaction, models
from django.core.files.base import ContentFile
from django.utils import timezone
from main.schema import (
    BadRequestSchema,
    NotFoundSchema,
)
from ninja import Router
from ninja.decorators import decorate_view
from users.auth import UidKeyAuth, JWTAuth
from users.providers import GithubProvider, GitlabProvider
from . import schema as s
from . import models as m

router = Router()
uidkey_auth = UidKeyAuth()
User = get_user_model()


@router.get(
    "/model/add/sprint/active/",
    auth=JWTAuth(),
    response={200: bool},
    tags=["registry", "model-add", "frontend"],
    include_in_schema=False,
)
def is_sprint_active(request):
    today = timezone.now().date()
    return m.Sprint.objects.filter(
        start_date__lte=today, end_date__gte=today
    ).exists()


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
    tags=["registry", "frontend"],
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
    "/model/{owner}/",
    auth=UidKeyAuth(),
    tags=["registry", "frontend"],
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_owner(request, owner: str):
    raise ValueError(f"{owner}")


@router.get(
    "/model/{owner}/{repository}/",
    response={200: s.ModelOut, 404: NotFoundSchema},
    auth=UidKeyAuth(),
    tags=["registry", "frontend"],
    include_in_schema=False,
)
@decorate_view(never_cache)
def repository_model(request, owner: str, repository: str):
    query = models.Q(repository__name=repository) & (
        models.Q(repository__organization__name=owner)
        | models.Q(repository__owner__username=owner)
    )

    try:
        model = m.RepositoryModel.objects.select_related(
            "repository",
            "repository__organization",
            "repository__owner",
            "disease",
        ).get(query)
    except m.RepositoryModel.DoesNotExist:
        return 404, {"message": f"Model '{owner}/{repository}' not found"}

    return model


@router.get(
    "/model/{owner}/{repository}/readme/",
    response={200: dict, 404: NotFoundSchema},
    auth=UidKeyAuth(),
    tags=["registry", "repository", "frontend"],
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
    tags=["registry", "model", "frontend"],
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
            "adm0",
            "adm1",
            "adm2",
            "adm3",
        )
        .annotate(
            start=models.Min("quantitativeprediction__data__date"),
            end=models.Max("quantitativeprediction__data__date"),
        )
        .order_by("-created_at")
    )

    return predictions


@router.get(
    "/model/{owner}/{repository}/permissions/",
    response=s.RepositoryPermissions,
    auth=JWTAuth(),
    tags=["registry", "model", "frontend"],
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
