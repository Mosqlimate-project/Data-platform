import os

port = os.getenv("REDIS_PORT")
broker_url = f"redis://mosqlimate-redis:{port}/0"
result_backend = f"redis://mosqlimate-redis:{port}/0"
broker_connection_retry_on_startup = True
