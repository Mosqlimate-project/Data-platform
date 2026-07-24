from ninja.security import APIKeyHeader, HttpBearer
from ninja.errors import HttpError

from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone

from .jwt import decode_token

User = get_user_model()


class JWTAuth(HttpBearer):
    def __call__(self, request):
        headers = request.headers
        auth_value = headers.get(self.header)
        token = None

        if auth_value and auth_value.startswith("Bearer "):
            token = auth_value.split(" ")[1]

        if not token:
            token = request.COOKIES.get("access_token")

        if not token:
            return None

        return self.authenticate(request, token)

    def authenticate(self, request, token):
        if not token:
            return None

        payload = decode_token(token)

        if not payload:
            return None

        if payload.get("type") == "refresh":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        try:
            user = User.objects.get(pk=user_id)

            if not user.is_active:
                return None

            return user
        except User.DoesNotExist:
            return None


class AdminJWTAuth(JWTAuth):
    def authenticate(self, request, token):
        user = super().authenticate(request, token)

        if user and not (user.is_staff or user.is_superuser):
            raise HttpError(403, "Forbidden")

        return user


class OptionalJWTAuth(JWTAuth):
    def __call__(self, request):
        user = super().__call__(request)
        if user is None or isinstance(user, AnonymousUser):
            return AnonymousUser()
        return user


class InvalidUIDKey(Exception):
    pass


class UidKeyAuth(APIKeyHeader):
    param_name = "X-UID-Key"

    def authenticate(self, request, uidkey):
        session = request.session
        user = request.user

        if user.is_authenticated and user.is_active:
            if not session.session_key:
                session.save()
            cache.set(session.session_key, user.api_key(), timeout=3600)

        if uidkey is None:
            if not session.session_key:
                session.save()
            uidkey = cache.get(session.session_key, None)

        uid = None
        key = None

        if ":" in str(uidkey):
            uid, key = str(uidkey).split(":")

        try:
            user = User.objects.get(username=uid, uuid=key)

            if not user.is_active:
                raise InvalidUIDKey

            if user.expires_at and timezone.now() > user.expires_at:
                raise InvalidUIDKey

            request.user = user
            return user
        except User.DoesNotExist:
            pass

        raise InvalidUIDKey


class OptionalUidKeyAuth(UidKeyAuth):
    def __call__(self, request):
        try:
            user = super().__call__(request)
            if user is None:
                return AnonymousUser()
            return user
        except InvalidUIDKey:
            return AnonymousUser()


class SdkKeyAuth(APIKeyHeader):
    """Auth via X-SDK-Key header. Returns the user if the key is valid and not expired."""

    param_name = "X-SDK-Key"

    def authenticate(self, request, sdk_key):
        if not sdk_key:
            return None

        try:
            user = User.objects.get(sdk_key=sdk_key)
        except User.DoesNotExist:
            return None

        if not user.is_active:
            return None

        if user.sdk_key_is_expired():
            return None

        return user


class ChartAuthFailed(Exception):
    pass


class ChartAuth(APIKeyHeader):
    """Accept either X-UID-Key or X-SDK-Key for chart endpoints.

    Staff and superusers bypass key authentication entirely.
    """

    param_name = "X-SDK-Key"

    def __call__(self, request):
        user = getattr(request, "user", None)
        if (
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        ):
            return user
        return super().__call__(request)

    def authenticate(self, request, sdk_key=None):
        # Try SDK key first
        if sdk_key:
            try:
                user = User.objects.get(sdk_key=sdk_key)
                if user.is_active and not user.sdk_key_is_expired():
                    return user
            except (User.DoesNotExist, Exception):
                pass

        # Fall back to UID key
        uidkey = request.headers.get("X-UID-Key")
        if uidkey and ":" in str(uidkey):
            uid, key = str(uidkey).split(":", 1)
            try:
                user = User.objects.get(username=uid, uuid=key)
                if user.is_active:
                    if not (
                        user.expires_at and timezone.now() > user.expires_at
                    ):
                        return user
            except (User.DoesNotExist, Exception):
                pass

        raise ChartAuthFailed
