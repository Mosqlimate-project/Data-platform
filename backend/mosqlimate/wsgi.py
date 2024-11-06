"""
WSGI config for mosqlimate project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/
"""

from dotenv import load_dotenv

from django.core.wsgi import get_wsgi_application

load_dotenv()

application = get_wsgi_application()
