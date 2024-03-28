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
import logging
from pathlib import Path
from dotenv import load_dotenv

from django.core.management.utils import get_random_secret_key
from jinja2 import Environment, FileSystemLoader

load_dotenv()
print("------ .env ------")

project_dir = Path(__file__).parent.parent.parent
templates = Environment(
    loader=FileSystemLoader(project_dir / "contrib" / "templates")
)
def_data_dir = project_dir.parent / "storage"
CI = os.environ.get("CI", default=False)


def get_env_var_or_input(
    var_key: str, input_text, default_val=None, required=False
):
    """
    var_key: Name of the environment variable as in template
    input_text: Text for the input with the default_val in [brackets]
    default_val: Default value if any
    required: if there's no default_val, but is required
    """
    is_ci = True if CI else False
    env_value = os.environ.get(var_key)

    if not env_value and default_val and is_ci:
        return default_val
    elif not env_value and not default_val and is_ci:
        raise EnvironmentError(f"{var_key} not found in environment")

    if not env_value and not is_ci:
        val_in = input(input_text)  # asks for input
        if not val_in and not default_val and required:
            logging.warning(
                f"You need to provide {var_key}, "
                "refer to Mosqlimate documentation to more information"
            )
            get_env_var_or_input(var_key, input_text, default_val)  # ask again
        elif not val_in and not default_val and not required:
            return None
        if not val_in and default_val:
            return default_val
        return val_in
    return env_value


var_in = get_env_var_or_input

print(
    "Mosqlimate environment configuration. Press [Enter] to leave the default value"
)

print("\nDjango Core:")
env = str(
    var_in("ENV", input_text="  Environment [dev]: ", default_val="dev")
).lower()
secret_key = var_in(
    "SECRET_KEY",
    "  Django Secret Key [random]: ",
    default_val=get_random_secret_key(),
)
allowed_hosts = var_in(
    "ALLOWED_HOSTS", input_text="  Allowed hosts ['*']: ", default_val="*"
)
dj_settings = (
    "mosqlimate.settings.prod" if env == "prod" else "mosqlimate.settings.dev"
)


print("\nDjango Image:")
uid = var_in(
    "HOST_UID",
    input_text=f"  Host UID [{os.getuid()}]: ",
    default_val=os.getuid(),
)
gid = var_in(
    "HOST_GID",
    input_text=f"  Host GUI [{os.getgid()}]: ",
    default_val=os.getgid(),
)
dj_port = var_in(
    "DJANGO_PORT", input_text="  Django port [8042]: ", default_val=8042
)

def_dj_host_data = def_data_dir / "django"

dj_host_data = var_in(
    "DJANGO_HOST_DATA_PATH",
    input_text=(f"  Django data storage dir on host [{def_dj_host_data}]: "),
    default_val=def_dj_host_data.absolute(),
)
dj_cont_data = var_in(
    "DJANGO_CONTAINER_DATA_PATH",
    input_text=(
        "  Django data storage dir on container [/opt/services/storage/django]: "
    ),
    default_val="/opt/services/storage/django",
)

print("\nRedis:")
redis_port = var_in(
    "REDIS_PORT", input_text="  Redis port [8044]: ", default_val=8044
)

print("\nDjango Image:")
worker_port = var_in(
    "WORKER_PORT", input_text="  Django Worker port [8044]: ", default_val=8045
)

print("\nDjango OAuth:")
site_domain = var_in(
    "SITE_DOMAIN",
    input_text=f"  Django Sites domain [0.0.0.0:{dj_port}]: ",
    default_val=f"0.0.0.0:{dj_port}",
)
site_name = var_in(
    "SITE_NAME",
    input_text="  Django Sites name [localhost]: ",
    default_val="localhost",
)
github_id = var_in(
    "GITHUB_CLIENT_ID",
    input_text="  GitHub Client ID (CONTRIBUTING.md)*: ",
    required=True,
)
github_secret = var_in(
    "GITHUB_SECRET",
    input_text="  Github API Secret (CONTRIBUTING.md)*: ",
    required=True,
)

print("\nDjango PostgreSQL config:")
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
psql_uri = (
    f"postgresql://{psql_user}:{psql_pass}@{psql_host}:{psql_port}/{psql_db}"
)
infodengue_uri = var_in(
    "INFODENGUE_POSTGRES_URI",
    input_text="  External psql connection with Infodengue: ",
    default_val=psql_uri,
)


print("\nPostgreSQL Image:")
psql_uid = var_in(
    "POSTGRES_HOST_UID",
    input_text=f"  Postgresql Host UID [{uid}]: ",
    default_val=uid,
)
psql_gid = var_in(
    "POSTGRES_HOST_GID",
    input_text=f"  Postgresql Host GID [{gid}]: ",
    default_val=gid,
)
def_psql_dir = def_data_dir / "psql"
psql_host_conf = var_in(
    "POSTGRES_CONF_DIR_HOST",
    input_text=f"  postgresql.conf directory on host [{def_psql_dir}]: ",
    default_val=def_psql_dir.absolute(),
)
psql_host_data = var_in(
    "POSTGRES_DATA_DIR_HOST",
    input_text=(
        f"  Postgresql data directory on host: [{def_psql_dir}/pgdata/]: "
    ),
    default_val=(def_psql_dir / "pgdata").absolute(),
)

Path(str(dj_host_data)).mkdir(exist_ok=True, parents=True)
Path(str(psql_host_conf)).mkdir(exist_ok=True, parents=True)
Path(str(psql_host_data)).mkdir(exist_ok=True, parents=True)

print("\nDjango Email config")
dj_default_from_email = var_in(
    "DEFAULT_FROM_EMAIL",
    input_text="  Django default email [email@example.com]: ",
    default_val="email@example.com",
)
dj_email_backend = var_in(
    "EMAIL_BACKEND",
    input_text="Email backend [django.core.mail.backends.smtp.EmailBackend]: ",
    default_val="django.core.mail.backends.smtp.EmailBackend",
)
dj_email_host = var_in(
    "EMAIL_HOST",
    input_text="Email host [smtp.example.com]: ",
    default_val="smtp.example.com",
)
dj_email_port = var_in(
    "EMAIL_PORT", input_text="Email port [587]: ", default_val=587
)
dj_email_host_user = var_in(
    "EMAIL_HOST_USER",
    input_text="Email host user [email@example.com]: ",
    default_val="email@example.com",
)
dj_email_host_pass = var_in(
    "EMAIL_HOST_PASSWORD", input_text="Email host password: "
)
dj_email_use_tls = True


dotenv_template = templates.get_template("env.tpl")
dotenv_file = project_dir / ".env"

variables = {
    # [Django Core]
    "ENV": env,
    "SECRET_KEY": secret_key,
    "ALLOWED_HOSTS": allowed_hosts,
    "DJANGO_SETTINGS_MODULE": dj_settings,
    # [Django Image]
    "HOST_UID": uid,
    "HOST_GID": gid,
    "DJANGO_PORT": dj_port,
    "DJANGO_HOST_DATA_PATH": str(dj_host_data),
    "DJANGO_CONTAINER_DATA_PATH": str(dj_cont_data),
    # [Django Worker]
    "WORKER_PORT": worker_port,
    # [Django Oauth]
    "SITE_DOMAIN": site_domain,
    "SITE_NAME": site_name,
    "GITHUB_CLIENT_ID": github_id,
    "GITHUB_SECRET": github_secret,
    # [Django PostgreSQL]
    "POSTGRES_HOST": psql_host,
    "POSTGRES_PORT": psql_port,
    "POSTGRES_USER": psql_user,
    "POSTGRES_PASSWORD": psql_pass,
    "POSTGRES_DB": psql_db,
    "DEFAULT_POSTGRES_URI": psql_uri,
    "INFODENGUE_POSTGRES_URI": infodengue_uri,
    # [Postgres Image]
    "POSTGRES_HOST_UID": psql_uid,
    "POSTGRES_HOST_GID": psql_gid,
    "POSTGRES_CONF_DIR_HOST": str(psql_host_conf),
    "POSTGRES_DATA_DIR_HOST": str(psql_host_data),
    # [Postgres Email]
    "DEFAULT_FROM_EMAIL": dj_default_from_email,
    "EMAIL_BACKEND": dj_email_backend,
    "EMAIL_HOST": dj_email_host,
    "EMAIL_PORT": dj_email_port,
    "EMAIL_HOST_USER": dj_email_host_user,
    "EMAIL_HOST_PASSWORD": dj_email_host_pass,
    "EMAIL_USE_TLS": dj_email_use_tls,
    # [Mkdocs]
    "MKDOCS_PORT": 8043,
    # [Redis]
    "REDIS_PORT": redis_port,
}

if not CI:
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
