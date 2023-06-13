import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key

from contrib.scripts import templates

print("------ .env ------")

project_dir = Path(__file__).parent.parent.parent

print("[Django Core]")
uid = os.getuid()
gid = os.getgid()
env = "prod" if input("Environment [prod/dev]: ").lower().startswith("prod") else "dev"
secret_key = get_random_secret_key()
allowed_hosts = "*"

print("[PostgreSQL config]")
psql_uid = input("Postgresql UID [$(id -u)]: ") or uid
psql_gid = input("Postgresql GID [$(id -g)]: ") or gid
psql_host = "postgres"
psql_port = input("Postgresql port: ")
psql_user = input("Postgresql user: ")
psql_pass = input("Postgresql password ")
psql_db = input("Postgresql database: ")
psql_uri = f"postgresql://{psql_user}:{psql_pass}@{psql_host}:{psql_port}/{psql_db}"
psql_conf = input("postgresql.conf file location on host: ")
psql_data = input("PGDATA directory on host: ")

# print('[Django Email config]')
# dj_default_from_email = input("DEFAULT_FROM_EMAIL: ")
# dj_email_backend = input("EMAIL_BACKEND: ")
# dj_email_host = input("EMAIL_HOST: ")
# dj_email_port = input("EMAIL_PORT: ")
# dj_email_host_user = input("EMAIL_HOST_USER: ")
# dj_email_host_pass = input("EMAIL_HOST_PASSWORD: ")
# dj_email_use_tls = True

dotenv_template = templates.get_template(".env.tpl")
dotenv_file = project_dir / ".env"

variables = {
    "ENV": env,
    "SECRET_KEY": secret_key,
    "ALLOWED_HOSTS": allowed_hosts,
    "HOST_UID": uid,
    "HOST_GID": gid,
    "DATABASE_URL": psql_uid,
    "POSTGRES_HOST": psql_host,
    "POSTGRES_PORT": psql_port,
    "POSTGRES_USER": psql_user,
    "POSTGRES_DB": psql_db,
    "POSTGRES_PASSWORD": psql_pass,
    "POSTGRES_HOST_UID": psql_uid,
    "POSTGRES_HOST_GID": psql_gid,
    "POSTGRES_CONFIG_DIR_HOST": psql_conf,
    "POSTGRES_DATA_DIR_HOST": psql_data,
    # "DEFAULT_FROM_EMAIL": dj_default_from_email,
    # "EMAIL_BACKEND": dj_email_backend,
    # "EMAIL_HOST": dj_email_host,
    # "EMAIL_PORT": dj_email_port,
    # "EMAIL_HOST_USER": dj_email_host_user,
    # "EMAIL_HOST_PASSWORD": dj_email_host_pass,
    # "EMAIL_USE_TLS": dj_email_use_tls,
}

if dotenv_file.exists():
    answer = input(f".env found at {project_dir}, replace it? [y/n] ")
    if answer.lower() == "y":
        dotenv_file.unlink()

if not dotenv_file.exists():
    output = dotenv_template.render(variables)
    dotenv_file.touch()
    with open(dotenv_file, "w") as f:
        f.write(output)
