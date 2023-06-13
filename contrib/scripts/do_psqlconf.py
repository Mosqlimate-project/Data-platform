import os
from pathlib import Path

from contrib.scripts import templates

print("------ postgres.conf ------")

# Environment variables:
pgdata = "/var/lib/postgresql/data"  # INSIDE CONTAINER
allowed_hosts = os.environ.get("ALLOWED_HOSTS")
psql_port = os.environ.get("POSTGRES_PORT")
psql_data = os.environ.get("POSTGRES_CONFIG_DIR_HOST")

psql_template = templates.get_template("postgresql.conf")
variables = {
    "PGDATA": pgdata,
    "ALLOWED_HOSTS": allowed_hosts,
    "PORT": psql_port,
}

output = psql_template.render(variables)

data_dir = Path(str(psql_data))

file = data_dir / "postgresql.conf"

if file.exists():
    answer = input(f"postgresql.conf found at {data_dir}, replace it? [y/n] ")
    if answer.lower() == "y":
        file.unlink()

if not file.exists():
    file.touch()
    with open(file, "w") as f:
        f.write(output)
