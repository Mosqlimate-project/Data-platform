from .base import *  # noqa: F403
from .base import DATABASES as _base_databases  # noqa: E402

DEFAULT_CREDS = _base_databases["default"]

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": DEFAULT_CREDS["NAME"],
        "USER": DEFAULT_CREDS["USER"],
        "PASSWORD": DEFAULT_CREDS["PASSWORD"],
        "HOST": DEFAULT_CREDS["HOST"],
        "PORT": DEFAULT_CREDS["PORT"],
        "TEST": {
            "NAME": "test_mosqlimate_dev",
        },
    },
    "infodengue": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": DEFAULT_CREDS["NAME"],
        "USER": DEFAULT_CREDS["USER"],
        "PASSWORD": DEFAULT_CREDS["PASSWORD"],
        "HOST": DEFAULT_CREDS["HOST"],
        "PORT": DEFAULT_CREDS["PORT"],
        "TEST": {
            "NAME": "test_mosqlimate_dev",
            "MIGRATE": False,
            "CREATE_DB": False,
            "SERIALIZE": False,
        },
    },
}

DATABASE_ROUTERS: tuple[str, ...] = ()  # type: ignore[no-redef]

TEST_RUNNER = "mosqlimate.settings.test_runner.SimpleTestRunner"

PASSWORD_HASHERS = ("django.contrib.auth.hashers.MD5PasswordHasher",)
