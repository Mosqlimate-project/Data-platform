"""
ASGI config for mosqlimate project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

from dotenv import load_dotenv

from django.core.asgi import get_asgi_application

load_dotenv()

application = get_asgi_application()
