import os
from pathlib import Path
from dotenv import load_dotenv

from jinja2 import Environment, FileSystemLoader

load_dotenv()

print("------ postgres.conf ------")

project_dir = Path(__file__).parent.parent.parent
templates = Environment(loader=FileSystemLoader(project_dir / "contrib" / "templates"))

# Environment variables:
allowed_hosts = os.environ.get("ALLOWED_HOSTS")
psql_port = os.environ.get("POSTGRES_PORT")
psql_data = os.environ.get("POSTGRES_DATA_DIR_HOST")
psql_conf = os.environ.get("POSTGRES_CONF_DIR_HOST")

psql_template = templates.get_template("postgresql.conf")
variables = {
    "PGDATA": "/var/lib/postgresql/data",  # INSIDE CONTAINER
    "ALLOWED_HOSTS": allowed_hosts,
    "PORT": psql_port,
}

output = psql_template.render(variables)

data_dir, conf_dir = map(Path, (str(psql_data), str(psql_conf)))

data_dir.mkdir(exist_ok=True, parents=True)

file = conf_dir / "postgresql.conf"

if file.exists():
    answer = input(f"postgresql.conf found at {data_dir}, replace it? [y/n] ")
    if answer.lower() == "y":
        file.unlink()

if not file.exists():
    file.touch()
    with open(file, "w") as f:
        f.write(output)
