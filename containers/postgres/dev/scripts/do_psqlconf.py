import os
from pathlib import Path
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

if not load_dotenv():
    print(".env file not found")

templates = Environment(
    loader=FileSystemLoader(Path(__file__).parent.parent / "templates")
)

psql_template = templates.get_template("postgresql.conf")
variables = {
    "PGDATA": "/var/lib/postgresql/data",
    "ALLOWED_HOSTS": os.environ.get("ALLOWED_HOSTS"),
    "PORT": os.environ.get("POSTGRES_PORT"),
}

output = psql_template.render(variables)

data_dir = Path(os.environ.get("POSTGRES_CONFIG_DIR_HOST"))

file = data_dir / "postgresql.conf"

if file.exists():
    answer = input(
        f"postgresql.conf found at {data_dir}, do you wanna replace it? [y/n] "
    )
    if answer.lower() == "y":
        file.unlink()

if not file.exists():
    file.touch()
    with open(file, "w") as f:
        f.write(output)
