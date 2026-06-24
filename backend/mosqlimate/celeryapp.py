import os

from celery import Celery

app = Celery("mosqlimate")
app.config_from_object("mosqlimate.settings.celery", namespace="CELERY")
app.autodiscover_tasks()

sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[CeleryIntegration()],
    )
