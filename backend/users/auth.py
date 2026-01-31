from ninja.security import APIKeyHeader, HttpBearer

from django.core.cache import cache
from django.contrib.auth import get_user_model

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
            return user
        except User.DoesNotExist:
            return None


class InvalidUIDKey(Exception):
    pass


class UidKeyAuth(APIKeyHeader):
    """Returns UID:Key pair if valid and (401, Unauthorized) if invalid"""

    param_name = "X-UID-Key"

    def authenticate(self, request, uidkey):
        session = request.session
        user = request.user

        if user.is_authenticated:
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
            request.user = user
            return user
        except User.DoesNotExist:
            pass

        raise InvalidUIDKey
