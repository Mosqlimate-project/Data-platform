from mosqlimate.celeryapp import app

import subprocess


@app.task
def test():
    subprocess.run(["curl", "http://mosqlimate-django:8042"])


app.conf.beat_schedule = {
    "add-every-30-seconds": {
        "task": "vis.tasks.test",
        "schedule": 30.0,
    },
}
