from .base import *  # noqa: F403
import mimetypes

HOST_SCHEME = "http://"
SECURE_PROXY_SSL_HEADER = None
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = None
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_FRAME_DENY = False
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    f"http://localhost:{FRONTEND_PORT}",  # noqa: F405
    f"http://127.0.0.1:{FRONTEND_PORT}",  # noqa: F405
    "https://mosqlimate.org",
]
CORS_ALLOW_CREDENTIALS = True
mimetypes.add_type("application/javascript", ".js", True)
CSRF_TRUSTED_ORIGINS = [
    f"http://localhost:{FRONTEND_PORT}",  # noqa: F405
    f"http://127.0.0.1:{FRONTEND_PORT}",  # noqa: F405
]
