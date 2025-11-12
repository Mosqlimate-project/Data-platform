from ninja.security import APIKeyHeader, HttpBearer

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from .jwt import decode_token

User = get_user_model()


class InvalidUIDKey(Exception):
    pass


class JWTAuth(HttpBearer):
    def authenticate(self, request, token=None):
        if not token:
            token = request.COOKIES.get("access_token")
        payload = decode_token(token)
        if not payload:
            return None
        try:
            return User.objects.get(pk=payload["sub"])
        except User.DoesNotExist:
            return None


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

        if ":" in str(uidkey):
            uid, key = uidkey.split(":")
            if self.validate_uid_key(uid, key):
                return uidkey
        raise InvalidUIDKey

    def validate_uid_key(self, uid: str, key: str) -> bool:
        """Searches for the User with the exact pair"""
        try:
            User.objects.get(username=uid, uuid=key)
            return True
        except (User.DoesNotExist, ValidationError):
            return False
        return False
