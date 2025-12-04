"""
ASGI config for mosqlimate project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mosqlimate.settings")

asgi = get_asgi_application()

# fmt: off
from chatbot import routing  # noqa: E402
# fmt: on

application = ProtocolTypeRouter(
    {
        "http": asgi,
        "websocket": AllowedHostsOriginValidator(
            URLRouter(routing.websocket_urlpatterns)
        ),
    }
)
