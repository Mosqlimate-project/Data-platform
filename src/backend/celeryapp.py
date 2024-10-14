from celery import Celery


app = Celery("mosqlimate")
app.config_from_object("settings.celery", namespace="CELERY")
app.autodiscover_tasks()
