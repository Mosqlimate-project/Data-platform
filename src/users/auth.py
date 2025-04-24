from ninja.security import APIKeyHeader

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class InvalidUIDKey(Exception):
    pass


class UidKeyAuth(APIKeyHeader):
    """Returns UID:Key pair if valid and (401, Unauthorized) if invalid"""

    param_name = "X-UID-Key"

    def authenticate(self, request, uidkey):
        if uidkey is None:
            if not request.session.session_key:
                request.session.save()
            uidkey = cache.get(request.session.session_key, None)

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
