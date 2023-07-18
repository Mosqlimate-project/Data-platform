"""
This module has three main purposes:
- Define default values to environment variables
- Serve as a Contributor guide to generate the .env file  
- Intermediate the logic between the CI env vars and the .env file

It will use Jinja2 and the `.env.tpl` file at contrib/templates directory,
the `get_env_var_or_input` method firstly checks if the target variable exists
in the local variables, then asks for an input if the variable doesn't exist. A 
default_val will be returned. A default value will be overridden if it already 
exists on Environment and it won't ask for input. 
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

from django.core.management.utils import get_random_secret_key
from jinja2 import Environment, FileSystemLoader

print("------ .env ------")

project_dir = Path(__file__).parent.parent.parent
templates = Environment(loader=FileSystemLoader(project_dir / "contrib" / "templates"))
def_data_dir = project_dir / "data"


def get_env_var_or_input(var_key: str, input_text, default_val=None):
    """
    var_key: Name of the environment variable as in template
    input_text: Text for the input with the default_val in [brackets]
    default_val: Default value if any
    """
    # First checks if the value is on environment
    var_value = os.environ.get(var_key)
    if not var_value:
        # Asks for input if it is a terminal
        if os.isatty(sys.stdin.fileno()):
            var_in = input(input_text)
            if not var_in:
                return default_val
            return var_in
        # If not terminal
        else:
            if default_val:
                return default_val
            raise EnvironmentError(f"{var_key} not found in environment")
        # If not input, returns default
    return var_value


var_in = get_env_var_or_input

print("Mosqlimate environment configuration. Press [Enter] to leave the default value")
print("\nDjango Core:")
uid = var_in("HOST_UID", input_text="  Host UID [$(id -u)]: ", default_val=os.getuid())
gid = var_in("HOST_GID", input_text="  Host GUI [$(id -g)]: ", default_val=os.getgid())
env = var_in("ENV", input_text="  Environment [dev]: ", default_val="dev")
secret_key = var_in(
    "SECRET_KEY",
    "  Django Secret Key [random]: ",
    default_val=get_random_secret_key(),
)
allowed_hosts = var_in(
    "ALLOWED_HOSTS", input_text="  Allowed hosts ['*']: ", default_val="*"
)
def_dj_data_dir = def_data_dir / "django"
def_dj_static_dir = def_dj_data_dir / "static"
static_root = var_in(
    "STATIC_ROOT",
    input_text=(
        "  Staticfiles directory on host "
        f"[{def_dj_data_dir.relative_to(project_dir)}/staticfiles]: "
    ),
    default_val=(def_dj_static_dir).absolute(),
)


print("\nDjango OAuth:")
site_domain = var_in(
    "SITE_DOMAIN",
    input_text="  Django Sites domain [localhost:PORT]: ",
    default_val="localhost:8000",
)  # TODO: Change PORT to django docker port
site_name = var_in(
    "SITE_NAME", input_text="  Django Sites name [localhost]: ", default_val="localhost"
)
github_id = var_in("GITHUB_CLIENT_ID", input_text="  GitHub Client ID: ")
github_secret = var_in("GITHUB_SECRET", input_text="  Github API Secret: ")

print("\nPostgreSQL config:")
psql_uid = var_in(
    "POSTGRES_HOST_UID",
    input_text="  Postgresql Host UID [$(id -u)]: ",
    default_val=uid,
)
psql_gid = var_in(
    "POSTGRES_HOST_GID",
    input_text="  Postgresql Host GID [$(id -g)]: ",
    default_val=gid,
)
psql_host = "postgres"
psql_port = var_in(
    "POSTGRES_PORT", input_text="  Postgresql port [5432]: ", default_val=5432
)
psql_user = var_in(
    "POSTGRES_USER",
    input_text="  Postgresql user [mosqlimate-dev]: ",
    default_val="mosqlimate-dev",
)
psql_pass = var_in(
    "POSTGRES_PASSWORD",
    input_text="  Postgresql password [mosqlimate-dev]: ",
    default_val="mosqlimate-dev",
)
psql_db = var_in(
    "POSTGRES_DB",
    input_text="  Postgresql database [mosqlimate-dev]: ",
    default_val="mosqlimate-dev",
)
psql_uri = f"postgresql://{psql_user}:{psql_pass}@{psql_host}:{psql_port}/{psql_db}"

def_psql_dir = def_data_dir / "psql"
psql_conf = var_in(
    "POSTGRES_CONF_DIR_HOST",
    input_text=(
        "  postgresql.conf directory on host "
        f"[./{def_psql_dir.relative_to(project_dir)}]: "
    ),
    default_val=def_psql_dir.absolute(),
)
psql_data = var_in(
    "POSTGRES_DATA_DIR_HOST",
    input_text=(
        "  Postgresql data directory on host: "
        f"[./{def_psql_dir.relative_to(project_dir)}/pgdata/]: "
    ),
    default_val=(def_psql_dir / "pgdata").absolute(),
)

Path(psql_conf).mkdir(exist_ok=True, parents=True)
Path(psql_data).mkdir(exist_ok=True, parents=True)

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
    # [Django Core]
    "ENV": env,
    "SECRET_KEY": secret_key,
    "ALLOWED_HOSTS": allowed_hosts,
    "HOST_UID": uid,
    "HOST_GID": gid,
    "STATIC_ROOT": static_root,
    "DJANGO_SETTINGS_MODULE": (
        "mosqlimate.settings.prod"
        if str(env).lower() == "prod"
        else "mosqlimate.settings.dev"
    ),
    # [Django Oauth]
    "SITE_DOMAIN": site_domain,
    "SITE_NAME": site_name,
    "OAUTH_GITHUB_ID": github_id,
    "OAUTH_GITHUB_SECRET": github_secret,
    # [Django PostgreSQL]
    "DATABASE_URL": psql_uri,
    "POSTGRES_HOST": psql_host,
    "POSTGRES_PORT": psql_port,
    "POSTGRES_USER": psql_user,
    "POSTGRES_DB": psql_db,
    # [Postgres Image]
    "POSTGRES_PASSWORD": psql_pass,
    "POSTGRES_HOST_UID": psql_uid,
    "POSTGRES_HOST_GID": psql_gid,
    "POSTGRES_DATA_DIR_HOST": psql_data,
    "POSTGRES_CONF_DIR_HOST": psql_conf,
    # [Postgres Email]
    # "DEFAULT_FROM_EMAIL": dj_default_from_email,
    # "EMAIL_BACKEND": dj_email_backend,
    # "EMAIL_HOST": dj_email_host,
    # "EMAIL_PORT": dj_email_port,
    # "EMAIL_HOST_USER": dj_email_host_user,
    # "EMAIL_HOST_PASSWORD": dj_email_host_pass,
    # "EMAIL_USE_TLS": dj_email_use_tls,
}

if dotenv_file.exists():
    answer = ""
    print(f"\nNote: .env file found at {project_dir}, replace it? [y/N] ")
    while True:
        answer = input()
        if answer.lower() in ["y", "yes"]:
            dotenv_file.unlink()
            break
        if answer.lower() in ["n", "no"]:
            print("canceled")
            break

if not dotenv_file.exists():
    output = dotenv_template.render(variables)
    dotenv_file.touch()
    with open(dotenv_file, "w") as f:
        f.write(output)

load_dotenv()
