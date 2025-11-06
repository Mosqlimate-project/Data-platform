from ninja import Router
from ninja.security import django_auth
from django.contrib.auth import get_user_model, authenticate
from django.http import JsonResponse
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.orcid.views import OrcidOAuth2Adapter

from main.schema import ForbiddenSchema, NotFoundSchema, BadRequestSchema

from .models import CustomUser
from .schema import (
    UserInPost,
    UserSchema,
    LoginOut,
    UserOut,
    RefreshOut,
    LoginIn,
    RegisterIn,
)
from .jwt import create_access_token, create_refresh_token, decode_token

router = Router()

User = get_user_model()


@router.get("/social/callback/{provider}/")
def social_callback(request, provider: str, code: str, state: str):
    if provider == "github":
        adapter = GitHubOAuth2Adapter(request)
    elif provider == "google":
        adapter = GoogleOAuth2Adapter(request)
    elif provider == "orcid":
        adapter = OrcidOAuth2Adapter(request)
    else:
        return JsonResponse({"error": "Unknown provider"}, status=400)

    login = adapter.complete_login(request, app=None)
    data = login.account.extra_data

    return {
        "email": data.get("email"),
        "name": data.get("name") or data.get("login"),
        "provider_id": data.get("id") or data.get("orcid"),
        "provider": provider,
    }


@router.post("/login", response={200: LoginOut, 401: ForbiddenSchema})
def login(request, payload: LoginIn):
    if payload.email:
        user_obj = User.objects.filter(email__iexact=payload.email).first()
        if not user_obj:
            return 401, {"detail": "Email not registered"}
        username = user_obj.username
    elif payload.username:
        username = payload.username
    else:
        return 401, {"detail": "Username or email required"}

    user = authenticate(username=username, password=payload.password)

    if not user:
        return 401, {"detail": "Unauthorized"}

    return {
        "access_token": create_access_token({"sub": str(user.pk)}),
        "refresh_token": create_refresh_token({"sub": str(user.pk)}),
    }


@router.post(
    "/register",
    response={201: UserOut, 401: ForbiddenSchema, 400: BadRequestSchema},
)
def register(request, payload: RegisterIn):
    if User.objects.filter(email=payload.email).exists():
        return 400, {"detail": "Email already registered"}

    if User.objects.filter(username=payload.username).exists():
        return 400, {"detail": "Username already registered"}

    user = User.objects.create_user(
        first_name=payload.name,
        username=payload.username,
        email=payload.email,
        password=payload.password,
        is_staff=False,
    )

    return 201, user


@router.post("/refresh", response={200: RefreshOut, 401: ForbiddenSchema})
def refresh_token(request, token: str):
    payload = decode_token(token)

    if not payload or payload.get("type") != "refresh":
        return 401, {"detail": "Invalid or expired token"}

    user_id = payload.get("sub")

    try:
        User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return 401, {"detail": "User not found"}

    return {
        "access_token": create_access_token({"sub": str(user_id)}),
    }


@router.put(
    "/{username}",
    response={201: UserSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    include_in_schema=False,
)
def update_user(request, username: str, payload: UserInPost):
    """
    Updates User. It is not possible to change User's username nor email.
    To change a User's name, updates its first_name and last_name, which
    were inherit from a 3rd party OAuth User
    """
    try:
        user = CustomUser.objects.get(username=username)

        if request.user != user:  # TODO: Enable admins here
            return 403, {
                "message": "You are not authorized to update this user."
            }

        user.first_name = payload.first_name
        user.last_name = payload.last_name
        user.save()
        return 201, user
    except CustomUser.DoesNotExist:
        return 404, {"message": "Author not found"}
