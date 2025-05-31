"""
ASGI config for mosqlimate project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.sessions import SessionMiddlewareStack

from chatbot import routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mosqlimate.settings")

asgi = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": asgi,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                SessionMiddlewareStack(
                    URLRouter(routing.websocket_urlpatterns)
                )
            )
        ),
    }
)
