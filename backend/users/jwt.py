from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from django.conf import settings
from django.core.exceptions import ValidationError


def create_access_token(data: dict, expire_minutes: int = None):
    payload = data.copy()
    expires = datetime.utcnow() + timedelta(
        minutes=(expire_minutes or settings.JWT_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expires

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict, expire_days: int = None):
    payload = data.copy()
    expires = datetime.utcnow() + timedelta(
        days=(expire_days or settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload["exp"] = expires
    payload["type"] = "refresh"

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str):
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ValidationError:
        return None
    except ExpiredSignatureError:
        return None
    except JWTError:
        return None
