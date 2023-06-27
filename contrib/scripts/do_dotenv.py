import os
from pathlib import Path
from dotenv import load_dotenv

from django.core.management.utils import get_random_secret_key
from jinja2 import Environment, FileSystemLoader

print("------ .env ------")

project_dir = Path(__file__).parent.parent.parent
templates = Environment(loader=FileSystemLoader(project_dir / "contrib" / "templates"))


def get_env_var_or_input(var_key: str, input_text=None, default_val=None):
    var_value = os.environ.get(var_key) or default_val
    return input(input_text) if not var_value else var_value


var_in = get_env_var_or_input

print("[Django Core]")
uid = var_in("HOST_UID", default_val=os.getuid())
gid = var_in("HOST_UID", default_val=os.getgid())
env = var_in("ENV", input_text="Environment [prod/dev]: ")
secret_key = var_in("SECRET_KEY", default_val=get_random_secret_key())
allowed_hosts = var_in("ALLOWED_HOSTS", default_val="*")
static_root = var_in("ENV", input_text="Static files directory on host: ")

print("[PostgreSQL config]")
psql_uid = var_in(
    "POSTGRES_HOST_UID", input_text="Postgresql UID [$(id -u)]: ", default_val=uid
)
psql_gid = var_in(
    "POSTGRES_HOST_GID", input_text="Postgresql GID [$(id -g)]: ", default_val=gid
)
psql_host = "postgres"
psql_port = var_in("POSTGRES_PORT", input_text="Postgresql port: ")
psql_user = var_in("POSTGRES_USER", input_text="Postgresql user: ")
psql_pass = var_in("POSTGRES_PASSWORD", input_text="Postgresql password ")
psql_db = var_in("POSTGRES_DB", input_text="Postgresql database: ")
psql_uri = f"postgresql://{psql_user}:{psql_pass}@{psql_host}:{psql_port}/{psql_db}"
psql_data = var_in(
    "POSTGRES_DATA_DIR_HOST", input_text="Postgresql data directory on host: "
)
psql_conf = var_in(
    "POSTGRES_CONF_DIR_HOST", input_text="postgresql.conf directory on host: "
)

Path(psql_data).mkdir(exist_ok=True, parents=True)
Path(psql_conf).mkdir(exist_ok=True, parents=True)

# print("[Django Email config]")
# dj_default_from_email = var_in(
#     "DEFAULT_FROM_EMAIL", input_text="DEFAULT_FROM_EMAIL: "
# )
# dj_email_backend = var_in("EMAIL_BACKEND", input_text="EMAIL_BACKEND: ")
# dj_email_host = var_in("EMAIL_HOST", input_text="EMAIL_HOST: ")
# dj_email_port = var_in("EMAIL_PORT", input_text="EMAIL_PORT: ")
# dj_email_host_user = var_in(
#     "EMAIL_HOST_USER", input_text="EMAIL_HOST_USER: "
# )
# dj_email_host_pass = var_in(
#     "EMAIL_HOST_PASSWORD", input_text="EMAIL_HOST_PASSWORD: "
# )
# dj_email_use_tls = True

dotenv_template = templates.get_template(".env.tpl")
dotenv_file = project_dir / ".env"

variables = {
    "ENV": env,
    "SECRET_KEY": secret_key,
    "ALLOWED_HOSTS": allowed_hosts,
    "STATIC_ROOT": static_root,
    "DJANGO_SETTINGS_MODULE": [
        "mosqlimate.prod" if env.lower() == "prod" else "mosqlimate.dev"
    ],
    "HOST_UID": uid,
    "HOST_GID": gid,
    "DATABASE_URL": psql_uri,
    "POSTGRES_HOST": psql_host,
    "POSTGRES_PORT": psql_port,
    "POSTGRES_USER": psql_user,
    "POSTGRES_DB": psql_db,
    "POSTGRES_PASSWORD": psql_pass,
    "POSTGRES_HOST_UID": psql_uid,
    "POSTGRES_HOST_GID": psql_gid,
    "POSTGRES_DATA_DIR_HOST": psql_data,
    "POSTGRES_CONF_DIR_HOST": psql_conf,
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

load_dotenv()
