"""
WSGI config for mosqlimate project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from django.conf import settings
from blacknoise import BlackNoise

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mosqlimate.settings")

application = BlackNoise(get_wsgi_application(), root=settings.STATIC_ROOT)
