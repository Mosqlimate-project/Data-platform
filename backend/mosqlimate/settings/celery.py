import os

version = os.getenv("VERSION")
port = os.getenv("REDIS_PORT")
broker_url = f"redis://broker:{port}/0"
result_backend = f"redis://broker:{port}/0"
broker_connection_retry_on_startup = True
