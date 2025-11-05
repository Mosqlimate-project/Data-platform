from datetime import datetime, timedelta

import jwt
from django.conf import settings


def create_access_token(data: dict, expire_minutes: int = None):
    data = data.copy()
    expires = datetime.utcnow() + timedelta(
        minutes=(expire_minutes or settings.JWT_TOKEN_EXPIRE_MINUTES)
    )
    data.update({"exp": expires})
    return jwt.encode(
        data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(data: dict, expire_days: int = None):
    data = data.copy()
    expires = datetime.utcnow() + timedelta(
        days=(expire_days or settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    data.update({"exp": expires, "type": "refresh"})
    return jwt.encode(
        data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str):
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError:
        return None
