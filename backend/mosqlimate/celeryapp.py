from celery import Celery


app = Celery("mosqlimate")
app.config_from_object("mosqlimate.settings.celery", namespace="CELERY")
app.autodiscover_tasks()
