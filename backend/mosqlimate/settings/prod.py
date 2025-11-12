from .base import *  # noqa: F403

SESSION_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    "https://mosqlimate.org",
    "https://*.mosqlimate.org",
    "http://localhost",
    f"http://0.0.0.0:{FRONTEND_PORT}",  # noqa: F405
    "http://django",
    f"http://localhost:{FRONTEND_PORT}",  # noqa: F405
    f"http://0.0.0.0:{FRONTEND_PORT}",  # noqa: F405
]

# https://docs.djangoproject.com/en/4.2/ref/middleware/#http-strict-transport-security
SECURE_HSTS_SECONDS = 3600

# CORS_REPLACE_HTTPS_REFERER = False
# SECURE_CROSS_ORIGIN_OPENER_POLICY = None
#
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    f"http://localhost:{FRONTEND_PORT}",  # noqa: F405
    f"http://127.0.0.1:{FRONTEND_PORT}",  # noqa: F405
    "https://mosqlimate.org",
]
