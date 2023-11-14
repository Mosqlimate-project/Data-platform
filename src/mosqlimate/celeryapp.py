import os

from celery import Celery
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mosqlimate.settings.base")

app = Celery("mosqlimate")
app.config_from_object(settings, namespace="CELERY")
app.autodiscover_tasks()
