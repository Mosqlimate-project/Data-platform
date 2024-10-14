SESSION_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    "https://*",
    "http://*",
    "https://api.mosqlimate.org",
    "http://localhost",
    "http://0.0.0.0:8042",
    "http://django",
]

# https://docs.djangoproject.com/en/4.2/ref/middleware/#http-strict-transport-security
SECURE_HSTS_SECONDS = 3600

# CORS_REPLACE_HTTPS_REFERER = False
# SECURE_CROSS_ORIGIN_OPENER_POLICY = None
