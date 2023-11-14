from celery import Celery

from mosqlimate.settings import celery


app = Celery("mosqlimate")
app.config_from_object(celery, namespace="CELERY")
app.autodiscover_tasks()
