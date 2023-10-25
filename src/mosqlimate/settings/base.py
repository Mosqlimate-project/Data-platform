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
    "django",
]

DJANGO_APPS = [
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
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.github",
]

LOCAL_APPS = ["main", "datastore", "registry", "users"]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
]

ROOT_URLCONF = "mosqlimate.urls"

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

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
            ],
        },
    },
]

WSGI_APPLICATION = "mosqlimate.wsgi.application"


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
        "ENGINE": "django.db.backends.postgresql",
        "NAME": DEFAULT_URI.path.replace("/", ""),
        "USER": DEFAULT_URI.username,
        "PASSWORD": DEFAULT_URI.password,
        "HOST": "mosqlimate-postgres",
        "PORT": DEFAULT_URI.port,
    },
    "infodengue": {
        "ENGINE": "django.db.backends.postgresql",
        "OPTIONS": {"options": '-c search_path="Municipio","Dengue_global",weather'},
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
]


MEDIA_URL = "/media/"
MEDIA_ROOT = DJANGO_CONTAINER_DATA_PATH / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
