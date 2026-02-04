import os
from typing import Literal, Optional
from datetime import timedelta

import httpx
from ninja import Router, File
from ninja.files import UploadedFile
from ninja.decorators import decorate_view
from django.core import signing, files
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.http import HttpResponseRedirect
from django.views.decorators.cache import never_cache
from django.utils import timezone
from django.db import transaction, models
from django.utils.dateparse import parse_datetime
from pydantic.networks import validate_email
from pydantic_core import PydanticCustomError

from main.schema import ForbiddenSchema, NotFoundSchema, BadRequestSchema
from registry.models import (
    Repository,
    RepositoryModel,
    RepositoryContributor,
    OrganizationMembership,
)
from .models import OAuthAccount
from .auth import JWTAuth
from .jwt import create_access_token, create_refresh_token, decode_token
from .providers import OAuthProvider
from .adapters import OAuthAdapter
from . import schema as s

router = Router(tags=["user"])

User = get_user_model()


def download_image(user, url):
    if not url:
        return

    try:
        with httpx.Client() as client:
            response = client.get(url, timeout=10)
            if response.status_code == 200:
                filename = f"avatar_{user.pk}.jpg"
                user.avatar.save(
                    filename,
                    files.base.ContentFile(response.content),
                    save=True,
                )
                user.avatar_url = user.avatar.url
                user.save(update_fields=["avatar_url"])
    except Exception:
        pass


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@router.get(
    "/check-username/",
    include_in_schema=False,
)
@decorate_view(never_cache)
def check_username(request, username: str):
    exists = User.objects.filter(username__iexact=username).exists()
    return {"available": not exists}


@router.get(
    "/check-email/",
    include_in_schema=False,
)
@decorate_view(never_cache)
def check_email(request, email: str):
    exists = User.objects.filter(email__iexact=email).exists()
    return {"available": not exists}


@router.get(
    "/oauth/connections/",
    auth=JWTAuth(),
    response=list[str],
    include_in_schema=False,
)
@decorate_view(never_cache)
def get_connected_providers(request):
    return list(
        OAuthAccount.objects.filter(user=request.auth).values_list(
            "provider", flat=True
        )
    )


@router.get(
    "/oauth/login/{provider}/",
    response={200: dict, 400: BadRequestSchema},
    include_in_schema=False,
)
@decorate_view(never_cache)
def oauth_login(
    request,
    provider: Literal["google", "github", "gitlab"],
    next: Optional[str] = None,
):
    client = OAuthProvider.from_request(
        request, provider, extra_state={"next": next or ""}
    )
    return HttpResponseRedirect(client.get_auth_url())


@router.get(
    "/oauth/callback/{provider}/",
    response={200: dict, 400: BadRequestSchema},
    include_in_schema=False,
)
@decorate_view(never_cache)
def oauth_callback(
    request,
    provider: Literal["google", "github", "gitlab"],
    code: str,
    state: str,
):
    client = OAuthProvider.from_request(request, provider)
    ip = get_client_ip(request)

    try:
        state_data = client.decode_state(state)
        next_url = state_data.get("next", "")
    except signing.BadSignature:
        return 400, {"message": "Invalid or expired state"}

    try:
        token_data = client.get_token(code)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        expires_in = token_data.get("expires_in")
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timedelta(seconds=int(expires_in))

        if not access_token:
            return 400, {"message": "Missing access token"}

        raw_info = client.get_user_info(access_token, token_data)
    except httpx.HTTPError as e:
        return 400, {"message": f"HTTP error: {e}"}
    except Exception as e:
        return 400, {"message": str(e)}

    adapter = OAuthAdapter.from_request(request, provider, raw_info)
    provider_id = adapter.provider_id

    user = None
    token = request.COOKIES.get("access_token")
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            try:
                user = User.objects.get(pk=payload.get("sub"))
            except User.DoesNotExist:
                pass

    if user:
        if not user.avatar and adapter.avatar_url:
            download_image(user, adapter.avatar_url)

        OAuthAccount.objects.update_or_create(
            user=user,
            provider=provider,
            defaults={
                "provider_id": provider_id,
                "raw_info": raw_info,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "access_token_expires_at": expires_at,
            },
        )
        return HttpResponseRedirect(next_url)

    try:
        account = OAuthAccount.objects.select_related("user").get(
            provider=provider,
            provider_id=provider_id,
        )
        user = account.user

        if not user.avatar and adapter.avatar_url:
            download_image(user, adapter.avatar_url)

        account.access_token = access_token
        if refresh_token:
            account.refresh_token = refresh_token
        if expires_at:
            account.access_token_expires_at = expires_at

        account.save()

        data = signing.dumps(
            {
                "ip": ip,
                "access_token": create_access_token({"sub": str(user.pk)}),
                "refresh_token": create_refresh_token({"sub": str(user.pk)}),
                "next": next_url,
            },
            compress=True,
            salt="oauth-callback",
        )
        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/callback?data={data}"
        )

    except OAuthAccount.DoesNotExist:
        existing_user = None

        if adapter.email:
            existing_user = User.objects.filter(
                email__iexact=adapter.email,
            ).first()

        if existing_user:
            if not existing_user.avatar and adapter.avatar_url:
                download_image(existing_user, adapter.avatar_url)

            OAuthAccount.objects.create(
                user=existing_user,
                provider=provider,
                provider_id=provider_id,
                raw_info=raw_info,
                access_token=access_token,
                refresh_token=refresh_token,
                access_token_expires_at=expires_at,
            )

            data = signing.dumps(
                {
                    "ip": ip,
                    "access_token": create_access_token(
                        {"sub": str(existing_user.pk)}
                    ),
                    "refresh_token": create_refresh_token(
                        {"sub": str(existing_user.pk)}
                    ),
                    "next": next_url,
                },
                compress=True,
                salt="oauth-callback",
            )
            return HttpResponseRedirect(
                f"{settings.FRONTEND_URL}/oauth/callback?data={data}"
            )

        data = signing.dumps(
            {
                "action": "register",
                "username": adapter.username,
                "first_name": adapter.first_name,
                "last_name": adapter.last_name,
                "email": adapter.email,
                "avatar_url": adapter.avatar_url,
                "provider": provider,
                "provider_id": provider_id,
                "raw_info": raw_info,
                "access_token": access_token,
                "ip": ip,
                "refresh_token": refresh_token,
                "access_token_expires_at": (
                    expires_at.isoformat() if expires_at else None
                ),
                "next": next_url,
            },
            compress=True,
            salt="oauth-callback",
        )

        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/register?data={data}"
        )


@router.get(
    "/oauth/install/{provider}/",
    response={200: dict, 400: BadRequestSchema},
    include_in_schema=False,
    auth=JWTAuth(),
)
@decorate_view(never_cache)
def oauth_install(
    request,
    provider: Literal["github"],
    next: Optional[str] = None,
):
    client = OAuthProvider.from_request(
        request,
        provider,
        extra_state={"next": next or ""},
    )
    return 200, {"url": f"{client.install_url}?state={client.state}"}


@router.get(
    "/oauth/install/{provider}/callback/",
    response={200: dict, 400: BadRequestSchema, 401: ForbiddenSchema},
    auth=None,
    include_in_schema=False,
)
@decorate_view(never_cache)
def oauth_install_callback(
    request,
    provider: Literal["github"],
    installation_id: str = None,
    code: str = None,
    state: str = None,
):
    user = None
    token = request.COOKIES.get("access_token")
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            try:
                user = User.objects.get(pk=payload.get("sub"))
            except User.DoesNotExist:
                pass

    access_token = None
    if not user and code:
        try:
            client = OAuthProvider.from_request(request, provider)
            token_data = client.get_token(code)
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")

            if access_token:
                raw_info = client.get_user_info(access_token, token_data)
                adapter = OAuthAdapter.from_request(
                    request, provider, raw_info
                )
                account = OAuthAccount.objects.select_related("user").get(
                    provider=provider, provider_id=adapter.provider_id
                )
                user = account.user
        except Exception:
            pass

    if not user:
        return 401, {"message": "User not logged in during installation."}

    try:
        account = OAuthAccount.objects.get(user=user, provider=provider)

        if access_token:
            account.access_token = access_token
            account.refresh_token = refresh_token
            account.save()

        if not installation_id:
            token_to_use = access_token or account.access_token
            if not token_to_use:
                return 400, {
                    "message": "Missing access token to verify installation."
                }

            headers = {
                "Authorization": f"Bearer {token_to_use}",
                "Accept": "application/vnd.github.v3+json",
            }
            transport = httpx.HTTPTransport(retries=3)
            with httpx.Client(transport=transport) as http:
                resp = http.get(
                    "https://api.github.com/user/installations",
                    headers=headers,
                    params={"per_page": 1},
                )
                if resp.status_code == 200:
                    installs = resp.json().get("installations", [])
                    if installs:
                        installation_id = str(installs[0]["id"])

        if not installation_id:
            return 400, {
                "message": "Could not verify GitHub App installation."
            }

        client = OAuthProvider.from_request(request, provider)
        token_data = client.get_installation_token(installation_id)

        account.installation_id = installation_id
        account.installation_access_token = token_data["token"]
        account.installation_token_expires_at = token_data["expires_at"]
        account.save()

        next_url = "/"
        if state:
            try:
                decoded = client.decode_state(state)
                next_url = decoded.get("next", "/")
            except Exception:
                pass

        data = signing.dumps(
            {
                "action": "github_app_installed",
                "installation_id": installation_id,
                "next": next_url,
            },
            compress=True,
            salt="oauth-callback",
        )

        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/install/{provider}/callback?data={data}"
        )

    except OAuthAccount.DoesNotExist:
        return 404, {
            "message": "Link your GitHub account before installing the App."
        }


@router.get(
    "/oauth/decode/",
    include_in_schema=False,
    response={200: dict, 400: BadRequestSchema},
)
@decorate_view(never_cache)
def oauth_decode(request, data: str):
    try:
        decoded = signing.loads(data, salt="oauth-callback", max_age=300)
    except signing.BadSignature:
        return 400, {"message": "Invalid or expired data"}

    original_ip = decoded.get("ip_address")
    current_ip = get_client_ip(request)

    if original_ip and original_ip != current_ip:
        return 400, {"message": "Security check failed: IP address mismatch"}

    return decoded


@router.get(
    "/me/",
    response={200: s.UserOut, 400: BadRequestSchema},
    auth=JWTAuth(),
    include_in_schema=False,
)
def me(request):
    user = request.auth
    if not user:
        return 400, {"message": "Invalid or expired token"}
    return user


@router.get(
    "/api-key/",
    response={200: dict, 400: BadRequestSchema},
    auth=JWTAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def api_key(request):
    user = request.auth
    if not user:
        return 400, {"message": "Invalid or expired token"}
    return 200, {"api_key": user.api_key()}


@router.post(
    "/api-key/refresh/",
    response={201: dict, 400: BadRequestSchema},
    auth=JWTAuth(),
    include_in_schema=False,
)
@decorate_view(never_cache)
def refresh_api_key(request):
    user = request.auth
    if not user:
        return 400, {"message": "Invalid or expired token"}
    user.refresh_api_key()
    return 201, {"api_key": user.api_key()}


@router.post(
    "/login/",
    response={200: s.LoginOut, 403: ForbiddenSchema},
    include_in_schema=False,
)
def login(request, payload: s.LoginIn):
    identifier = payload.identifier
    try:
        validate_email(identifier)
        user_obj = User.objects.filter(email__iexact=identifier).first()
        if not user_obj:
            return 403, {"message": "Email not registered"}
        username = user_obj.username
    except PydanticCustomError:
        username = identifier

    user = authenticate(username=username, password=payload.password)
    if not user:
        return 403, {"message": "Unauthorized"}

    return {
        "access_token": create_access_token({"sub": str(user.pk)}),
        "refresh_token": create_refresh_token({"sub": str(user.pk)}),
    }


@router.post(
    "/register/",
    response={201: s.LoginOut, 200: s.LoginOut, 400: BadRequestSchema},
    include_in_schema=False,
    auth=None,
)
def register(request, payload: s.RegisterIn):
    oauth_info = None
    if payload.oauth_data:
        try:
            oauth_info = signing.loads(
                payload.oauth_data, salt="oauth-callback", max_age=600
            )
        except signing.BadSignature:
            return 400, {"message": "Invalid or expired OAuth data"}

    existing_user = User.objects.filter(email__iexact=payload.email).first()

    if existing_user:
        if oauth_info:
            expires_at = None
            if oauth_info.get("access_token_expires_at"):
                expires_at = parse_datetime(
                    oauth_info["access_token_expires_at"]
                )

            if not existing_user.avatar and oauth_info.get("avatar_url"):
                download_image(existing_user, oauth_info.get("avatar_url"))

            OAuthAccount.objects.update_or_create(
                user=existing_user,
                provider=oauth_info["provider"],
                defaults={
                    "provider_id": oauth_info["provider_id"],
                    "raw_info": oauth_info["raw_info"],
                    "access_token": oauth_info["access_token"],
                    "refresh_token": oauth_info.get("refresh_token"),
                    "access_token_expires_at": expires_at,
                },
            )

            return 200, {
                "access_token": create_access_token(
                    {"sub": str(existing_user.pk)}
                ),
                "refresh_token": create_refresh_token(
                    {"sub": str(existing_user.pk)}
                ),
            }

        return 400, {"message": "Email already registered"}

    if User.objects.filter(username__iexact=payload.username).exists():
        return 400, {"message": "Username already registered"}

    user_kwargs = {
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "username": payload.username,
        "email": payload.email,
        "password": payload.password,
        "is_staff": False,
    }

    user = User.objects.create_user(**user_kwargs)

    if oauth_info and oauth_info.get("avatar_url"):
        download_image(user, oauth_info.get("avatar_url"))

    if oauth_info:
        expires_at = None
        if oauth_info.get("access_token_expires_at"):
            expires_at = parse_datetime(oauth_info["access_token_expires_at"])

        OAuthAccount.objects.create(
            user=user,
            provider=oauth_info["provider"],
            provider_id=oauth_info["provider_id"],
            raw_info=oauth_info["raw_info"],
            access_token=oauth_info["access_token"],
            refresh_token=oauth_info.get("refresh_token"),
            access_token_expires_at=expires_at,
        )

    return 201, {
        "access_token": create_access_token({"sub": str(user.pk)}),
        "refresh_token": create_refresh_token({"sub": str(user.pk)}),
    }


@router.post(
    "/refresh/",
    response={200: s.LoginOut, 401: ForbiddenSchema},
    include_in_schema=False,
)
def refresh_token(request, data: s.RefreshIn):
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        return 401, {"message": "Invalid or expired token"}

    user_id = payload.get("sub")

    try:
        User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return 401, {"message": "User not found"}

    return {
        "access_token": create_access_token({"sub": str(user_id)}),
        "refresh_token": create_refresh_token({"sub": str(user_id)}),
    }


@router.get(
    "/repositories/{provider}/",
    auth=JWTAuth(),
    response={
        200: list[s.RepositoryOut],
        401: BadRequestSchema,
        404: NotFoundSchema,
    },
    include_in_schema=False,
)
@decorate_view(never_cache)
def list_repositories(request, provider: Literal["github", "gitlab"]):
    user = request.auth

    try:
        account = OAuthAccount.objects.get(user=user, provider=provider)
    except OAuthAccount.DoesNotExist:
        return 404, {"message": f"Please link your {provider} account first."}

    client = OAuthProvider.from_request(request, provider)

    def fetch_repos(access_token):
        repos = client.get_user_repos(access_token)
        existing_repos = (
            Repository.objects.filter(
                provider=provider,
            )
            .select_related("owner", "organization")
            .only("name", "owner__username", "organization__name")
        )

        repo_names = set()
        for repo in existing_repos:
            owner_name = (
                repo.organization.name
                if repo.organization
                else repo.owner.username
            )
            repo_names.add(f"{owner_name}/{repo.name}".lower())

        for repo in repos:
            name = repo.get("name", "")
            available = True
            if name and name.lower() in repo_names:
                available = False
            repo["available"] = available

        return repos

    try:
        repos = fetch_repos(account.access_token)
        return 200, repos

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            try:
                with transaction.atomic():
                    account = OAuthAccount.objects.select_for_update().get(
                        pk=account.pk
                    )

                    if not account.refresh_token:
                        return 401, {
                            "message": (
                                "No refresh token available. Please reconnect."
                            )
                        }

                    try:
                        repos = fetch_repos(account.access_token)
                        return 200, repos
                    except httpx.HTTPStatusError:
                        pass

                    new_tokens = client.refresh_access_token(
                        account.refresh_token
                    )

                    account.access_token = new_tokens["access_token"]
                    account.refresh_token = new_tokens.get(
                        "refresh_token", account.refresh_token
                    )

                    expires_in = new_tokens.get("expires_in")
                    if expires_in:
                        account.access_token_expires_at = (
                            timezone.now() + timedelta(seconds=int(expires_in))
                        )
                    account.save()

                repos = fetch_repos(account.access_token)
                return 200, repos

            except Exception:
                return 401, {
                    "message": (
                        "Session expired or invalid. "
                        "Please reconnect your account."
                    )
                }

        raise e


@router.get(
    "/profile/",
    auth=JWTAuth(),
    response={
        200: s.ProfileOut,
        403: ForbiddenSchema,
    },
    include_in_schema=False,
)
@decorate_view(never_cache)
def profile(request):
    user = request.auth

    if not user:
        return 403, {"Unauthorized"}

    return 200, {
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "homepage": user.homepage,
        "avatar_url": user.get_avatar(),
    }


@router.post(
    "/profile/",
    auth=JWTAuth(),
    response={
        200: dict,
        403: ForbiddenSchema,
    },
    include_in_schema=False,
)
def update_profile(request, payload: s.ProfileIn):
    user = request.auth

    if not user:
        return 403, {"Unauthorized"}

    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(user, attr, value)

    user.save()

    return 200, {"message": "Profile updated successfully"}


@router.post(
    "/profile/avatar/",
    response={200: dict, 400: BadRequestSchema},
    auth=JWTAuth(),
    include_in_schema=False,
)
def upload_avatar(request, file: UploadedFile = File(...)):
    user = request.auth

    if not file.content_type.startswith("image/"):
        return 400, {"message": "File must be an image"}

    if file.size > 5 * 1024 * 1024:
        return 400, {"message": "Image too large (max 5MB)"}

    if user.avatar:
        try:
            if os.path.isfile(user.avatar.path):
                os.remove(user.avatar.path)
        except Exception:
            pass

    user.avatar.save(f"avatar_{user.pk}_{file.name}", file)
    user.avatar_url = user.avatar.url
    user.save(update_fields=["avatar_url", "avatar"])

    return 200, {"avatar_url": user.get_avatar()}


@router.get(
    "/profile/models/",
    auth=JWTAuth(),
    response={
        200: list[s.ProfileModelOut],
        403: ForbiddenSchema,
    },
    include_in_schema=False,
)
@decorate_view(never_cache)
def profile_models(request):
    user = request.auth

    manageable_org_ids = set(
        OrganizationMembership.objects.filter(
            user=user,
            role__in=[
                OrganizationMembership.Roles.OWNER,
                OrganizationMembership.Roles.MAINTAINER,
            ],
        ).values_list("organization_id", flat=True)
    )

    manageable_repo_ids = set(
        RepositoryContributor.objects.filter(
            user=user,
            permission__in=[
                RepositoryContributor.Permissions.ADMIN,
                RepositoryContributor.Permissions.WRITE,
            ],
        ).values_list("repository_id", flat=True)
    )

    models_qs = (
        RepositoryModel.objects.filter(
            models.Q(repository__owner=user)
            | models.Q(repository__organization__members=user)
            | models.Q(repository__repository_contributors__user=user)
        )
        .select_related(
            "repository",
            "repository__owner",
            "repository__organization",
            "disease",
        )
        .distinct()
    )

    result = []
    for model in models_qs:
        repo = model.repository
        can_manage = False

        if repo.owner_id == user.id:
            can_manage = True
        elif (
            repo.organization_id and repo.organization_id in manageable_org_ids
        ):
            can_manage = True
        elif repo.id in manageable_repo_ids:
            can_manage = True

        owner_name = (
            repo.owner.username if repo.owner else repo.organization.name
        )

        result.append(
            {
                "id": model.id,
                "name": repo.name,
                "owner": owner_name,
                "provider": repo.provider,
                "category": model.get_category_display(),
                "disease": str(model.disease),
                "can_manage": can_manage,
                "active": repo.active,
            }
        )

    return 200, result
