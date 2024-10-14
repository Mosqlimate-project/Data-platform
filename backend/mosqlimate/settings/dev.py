import os
from .base import *  # noqa: F403
import mimetypes

from mosqlient._config import set_api_url

HOST_SCHEME = "http://"
SECURE_PROXY_SSL_HEADER = None
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = None
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_FRAME_DENY = False
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
CORS_ALLOW_ALL_ORIGINS = True
mimetypes.add_type("application/javascript", ".js", True)

set_api_url(os.getenv("MOSQLIENT_API_URL", "http://0.0.0.0:8042/api/"))
