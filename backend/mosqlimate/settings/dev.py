from .base import *  # noqa: F403
import mimetypes

HOST_SCHEME = "http://"
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None
USE_X_FORWARDED_HOST = False

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

origins = [
    f"http://localhost:{FRONTEND_PORT}",  # noqa: F405
    f"http://127.0.0.1:{FRONTEND_PORT}",  # noqa: F405
    f"http://0.0.0.0:{FRONTEND_PORT}",  # noqa: F405
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = origins
CSRF_TRUSTED_ORIGINS = origins

mimetypes.add_type("application/javascript", ".js", True)
