from typing import Literal, Optional

import httpx
from ninja import Router
from ninja.decorators import decorate_view
from django.core import signing
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.http import HttpResponseRedirect
from django.views.decorators.cache import never_cache
from pydantic.networks import validate_email
from pydantic_core import PydanticCustomError

from main.schema import ForbiddenSchema, NotFoundSchema, BadRequestSchema
from .models import OAuthAccount
from .schema import (
    UserInPost,
    UserSchema,
    LoginOut,
    UserOut,
    LoginIn,
    RegisterIn,
    RefreshIn,
)
from .auth import JWTAuth
from .jwt import create_access_token, create_refresh_token, decode_token
from .providers import OAuthProvider
from .adapters import OAuthAdapter

router = Router(tags=["user"])

User = get_user_model()


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

    try:
        state_data = client.decode_state(state)
        next = state_data.get("next", "")
    except signing.BadSignature:
        return 400, {"message": "Invalid or expired state"}

    try:
        token_data = client.get_token(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return 400, {"message": "Missing access token"}
        raw_info = client.get_user_info(access_token, token_data)
    except httpx.HTTPError as e:
        return 400, {"message": f"HTTP error: {e}"}
    except Exception as e:
        return 400, {"message": str(e)}

    adapter = OAuthAdapter.from_request(request, provider, raw_info)
    provider_id = adapter.provider_id

    try:
        account = OAuthAccount.objects.select_related("user").get(
            provider=provider,
            provider_id=provider_id,
        )
        user = account.user

        data = signing.dumps(
            {
                "access_token": create_access_token({"sub": str(user.pk)}),
                "refresh_token": create_refresh_token({"sub": str(user.pk)}),
                "next": next,
            },
            compress=True,
            salt="oauth-callback",
        )

        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/callback?data={data}",
        )

    except OAuthAccount.DoesNotExist:
        existing_user = User.objects.filter(
            email__iexact=adapter.email,
        ).first()

        if existing_user:
            OAuthAccount.objects.update_or_create(
                user=existing_user,
                provider=provider,
                provider_id=provider_id,
                defaults={
                    "raw_info": raw_info,
                    "access_token": access_token,
                },
            )

            data = signing.dumps(
                {
                    "access_token": create_access_token(
                        {"sub": str(existing_user.pk)},
                    ),
                    "refresh_token": create_refresh_token(
                        {"sub": str(existing_user.pk)}
                    ),
                },
                compress=True,
                salt="oauth-callback",
            )
            return HttpResponseRedirect(
                f"{settings.FRONTEND_URL}/oauth/callback?data={data}",
            )
        auth_header = request.headers.get("Authorization")
        user = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                try:
                    user = User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    user = None

        if user:
            account, created = OAuthAccount.objects.update_or_create(
                provider=provider,
                provider_id=provider_id,
                defaults={
                    "user": user,
                    "raw_info": raw_info,
                    "access_token": access_token,
                },
            )
            action = "link" if created else "update"
            data = signing.dumps(
                {
                    "action": action,
                    "message": f"{provider} account {action}",
                    "next": next,
                },
                compress=True,
                salt="oauth-callback",
            )
            return HttpResponseRedirect(
                f"{settings.FRONTEND_URL}/oauth/link?data={data}",
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
                "next": next,
            },
            compress=True,
            salt="oauth-callback",
        )

        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/register?data={data}",
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
    setup_action: str = "install",
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
def oauth_decode(request, data: str):
    try:
        decoded = signing.loads(data, salt="oauth-callback", max_age=300)
    except signing.BadSignature:
        return 400, {"message": "Invalid or expired data"}
    return decoded


@router.get(
    "/me/",
    response={200: UserOut, 400: BadRequestSchema},
    auth=JWTAuth(),
)
def me(request):
    user = request.auth
    if not user:
        return 400, {"message": "Invalid or expired token"}
    return user


@router.post(
    "/login/",
    response={200: LoginOut, 403: ForbiddenSchema},
)
def login(request, payload: LoginIn):
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
    response={201: LoginOut, 400: BadRequestSchema},
    auth=None,
)
def register(request, payload: RegisterIn):
    if User.objects.filter(email=payload.email).exists():
        return 400, {"message": "Email already registered"}

    if User.objects.filter(username=payload.username).exists():
        return 400, {"message": "Username already registered"}

    user = User.objects.create_user(
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        email=payload.email,
        password=payload.password,
        is_staff=False,
    )

    return 201, {
        "access_token": create_access_token({"sub": str(user.pk)}),
        "refresh_token": create_refresh_token({"sub": str(user.pk)}),
    }


@router.post(
    "/refresh/",
    response={200: LoginOut, 401: ForbiddenSchema},
)
def refresh_token(request, data: RefreshIn):
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        return 401, {"detail": "Invalid or expired token"}

    user_id = payload.get("sub")

    try:
        User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return 401, {"detail": "User not found"}

    return {
        "access_token": create_access_token({"sub": str(user_id)}),
        "refresh_token": create_refresh_token({"sub": str(user_id)}),
    }


@router.get(
    "/repositories/{provider}/",
    auth=JWTAuth(),
    response={200: list[dict], 401: BadRequestSchema, 404: NotFoundSchema},
)
def list_repositories(request, provider: Literal["github", "gitlab"]):
    user = request.auth

    try:
        account = OAuthAccount.objects.get(user=user, provider=provider)
    except OAuthAccount.DoesNotExist:
        return 404, {"message": f"Please link your {provider} account first."}

    token = account.access_token
    client = OAuthProvider.from_request(request, provider)

    try:
        repos = client.get_user_repos(token)
        return 200, repos
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return 401, {"message": f"{e}"}
        raise e


@router.put(
    "/{username}",
    response={201: UserSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    include_in_schema=False,
)
def update_user(request, username: str, payload: UserInPost):
    """
    Updates User. It is not possible to change User's username nor email.
    To change a User's name, updates its first_name and last_name, which
    were inherit from a 3rd party OAuth User
    """
    try:
        user = User.objects.get(username=username)

        if request.user != user:  # TODO: Enable admins here
            return 403, {
                "message": "You are not authorized to update this user."
            }

        user.first_name = payload.first_name
        user.last_name = payload.last_name
        user.save()
        return 201, user
    except User.DoesNotExist:
        return 404, {"message": "Author not found"}
