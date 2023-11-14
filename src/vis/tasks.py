from celery.schedules import crontab

from mosqlimate.celeryapp import app


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(crontab(hour="*", minute="*"), test("hi"))


@app.task
def test(arg):
    print(arg)
