import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

load_dotenv()


def generate_postgres_configs():
    print("------ Generating Postgres Configuration ------")

    project_dir = Path(__file__).parent.parent.parent
    template_dir = project_dir / "contrib" / "templates"

    if not template_dir.exists():
        print(f"Error: Template directory not found at {template_dir}")
        sys.exit(1)

    templates = Environment(loader=FileSystemLoader(template_dir))

    listen_addresses = "*"
    psql_port = os.environ.get("POSTGRES_PORT", "5432")

    psql_data_dir_host = os.environ.get(
        "POSTGRES_DATA_DIR_HOST", "../storage2/psql/pgdata/"
    )

    pgdata_container = "/var/lib/postgresql/data"

    target_dir = Path(psql_data_dir_host).resolve()

    print(f"Target Directory: {target_dir}")

    try:
        target_dir.mkdir(exist_ok=True, parents=True)
    except PermissionError:
        print(f"Error: Permission denied creating {target_dir}")
        sys.exit(1)

    configs = [
        {
            "template": "postgresql.conf",
            "output": "postgresql.conf",
            "context": {
                "PGDATA": pgdata_container,
                "LISTEN_ADDRESSES": listen_addresses,
                "PORT": psql_port,
                "HBA_FILE": f"{pgdata_container}/pg_hba.conf",
            },
        },
        {"template": "pg_hba.conf", "output": "pg_hba.conf", "context": {}},
    ]

    for config in configs:
        try:
            tmpl = templates.get_template(config["template"])
            rendered_content = tmpl.render(config["context"])

            target_file = target_dir / config["output"]

            if target_file.exists():
                backup = target_file.with_suffix(".bak")
                shutil.copy(target_file, backup)

            print(f"Writing {config['output']}...")
            with open(target_file, "w") as f:
                f.write(rendered_content)

        except Exception as e:
            print(f"Failed to generate {config['output']}: {e}")
            sys.exit(1)

    print("------ Configuration Generated Successfully ------")
    print(
        "NOTE: You must restart the Postgres container for changes to take effect."
    )


if __name__ == "__main__":
    generate_postgres_configs()
