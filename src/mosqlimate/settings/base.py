import os
from pathlib import Path
from urllib.parse import urlparse

from django.contrib.messages import constants as messages
from dotenv import load_dotenv
import environ


load_dotenv()

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = env("SECRET_KEY")

DEBUG = str(env("ENV")).lower() == "dev"

DJANGO_CONTAINER_DATA_PATH = Path(
    env("DJANGO_CONTAINER_DATA_PATH", default=str(BASE_DIR / "staticfiles"))
)

ALLOWED_HOSTS = [
    "*",  #
    "0.0.0.0",
    "localhost",
    "127.0.0.1",
    "mosqlimate-django",
]

DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "ninja",
    "django_extensions",
    "dr_scaffold",
    "fontawesomefree",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.github",
    "django_celery_beat",
    # Plotly Dash
    "django_plotly_dash.apps.DjangoPlotlyDashConfig",
    "dpd_static_support",
    "channels",
    "channels_redis",
]

LOCAL_APPS = ["main", "datastore", "registry", "users", "vis", "chatbot"]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.cache.UpdateCacheMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.cache.FetchFromCacheMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django_plotly_dash.middleware.ExternalRedirectionMiddleware",
    "django_plotly_dash.middleware.BaseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "users.middleware.SessionCacheMiddleware",
]

ROOT_URLCONF = "mosqlimate.urls"

# https://stackoverflow.com/a/32347324
# STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "chatbot.context_processors.session_key",
            ],
        },
    },
]

WSGI_APPLICATION = "mosqlimate.wsgi.application"
ASGI_APPLICATION = "mosqlimate.asgi.application"


MESSAGE_TAGS = {
    messages.DEBUG: "alert-secondary",
    messages.INFO: "alert-info",
    messages.SUCCESS: "alert-success",
    messages.WARNING: "alert-warning",
    messages.ERROR: "alert-danger",
}


# [Databases]
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases
DEFAULT_URI = urlparse(env("DEFAULT_POSTGRES_URI"))
INFODENGUE_URI = urlparse(env("INFODENGUE_POSTGRES_URI"))
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": DEFAULT_URI.path.replace("/", ""),
        "USER": DEFAULT_URI.username,
        "PASSWORD": DEFAULT_URI.password,
        "HOST": os.environ.get("POSTGRES_HOST", "mosqlimate-postgres"),
        "PORT": DEFAULT_URI.port,
    },
    "infodengue": {
        "ENGINE": "django.db.backends.postgresql",
        "OPTIONS": {
            "options": '-c search_path="Municipio","Dengue_global",weather'
        },
        "NAME": INFODENGUE_URI.path.replace("/", ""),
        "USER": INFODENGUE_URI.username,
        "PASSWORD": INFODENGUE_URI.password,
        "HOST": INFODENGUE_URI.hostname,
        "PORT": INFODENGUE_URI.port,
    },
}

DATABASE_ROUTERS = (
    "datastore.routers.MunicipioRouter",
    "datastore.routers.WeatherRouter",
)

# 2 Factor Authentication (allauth)
# https://django-allauth.readthedocs.io/en/latest/configuration.html

##
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": f"{BASE_DIR.parent}/djangocache",
        "OPTIONS": {
            "MAX_ENTRIES": 1000,  # Adjust as needed
            "CULL_FREQUENCY": 10,  # Adjust as needed
        },
    }
}


SOCIALACCOUNT_PROVIDERS = {
    "github": {
        "VERIFIED_EMAIL": True,
        "SCOPE": [
            "read:user",
            "user:email",
        ],
        "APP": {
            "client_id": env("GITHUB_CLIENT_ID"),
            "secret": env("GITHUB_SECRET"),
            "key": "",
        },
    }
}

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

SITE_ID = 2  # select * from django_site;

AUTH_USER_MODEL = "users.CustomUser"

ACCOUNT_AUTHENTICATED_LOGIN_REDIRECTS = False
ACCOUNT_LOGOUT_REDIRECT_URL = "/"
ACCOUNT_ADAPTER = "users.adapter.RedirectOnLogin"
SOCIALACCOUNT_STORE_TOKENS = True
CHATBOT_TOKEN = env("CHATBOT_TOKEN")

# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

LANGUAGE_CODE = "pt-br"

TIME_ZONE = "America/Sao_Paulo"

USE_I18N = True

USE_L10N = True

USE_TZ = True

LOCALE_PATHS = [str(BASE_DIR / "templates" / "locale")]

LANGUAGES = (("en-us", "English"), ("pt-BR", "Português"), ("es", "Spanish"))


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/
STATIC_ROOT = str(BASE_DIR / "staticfiles")
# https://docs.djangoproject.com/en/dev/ref/settings/#static-url
STATIC_URL = "/static/"
# https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#std:setting-STATICFILES_DIRS
STATICFILES_DIRS = [str(BASE_DIR / "static")]
# https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#staticfiles-finders
STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
    # Plotly Dash
    "django_plotly_dash.finders.DashAssetFinder",
    "django_plotly_dash.finders.DashComponentFinder",
    "django_plotly_dash.finders.DashAppDirectoryFinder",
]


MEDIA_URL = "/media/"
MEDIA_ROOT = DJANGO_CONTAINER_DATA_PATH / "media"

X_FRAME_OPTIONS = "SAMEORIGIN"

PLOTLY_COMPONENTS = [
    # django-plotly-dash components
    "dpd_components",
    # static support if serving local assets
    "dpd_static_support",
    "dash_bootstrap_components",
]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                ("mosqlimate-redis", 6379),
            ],
        },
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DJANGO_LOG_LEVEL = env("DJANGO_LOG_LEVEL") or "INFO"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": DJANGO_LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": DJANGO_LOG_LEVEL,
            "propagate": False,
        },
    },
}
