from ninja.security import APIKeyHeader, HttpBearer
from ninja.errors import HttpError

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from .jwt import decode_token

User = get_user_model()


class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        payload = decode_token(token)

        if not payload:
            raise HttpError(401, "Invalid or expired token")

        if payload.get("type") == "refresh":
            raise HttpError(
                401, "Refresh token cannot be used for authentication"
            )

        user_id = payload.get("sub")

        if not user_id:
            raise HttpError(401, "Invalid token payload")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise HttpError(401, "User not found")

        return user


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
