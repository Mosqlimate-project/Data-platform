import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

load_dotenv()


def generate_postgres_configs():
    print("------ Generating Postgres Configuration ------")

    project_dir = Path(__file__).parent.parent.parent
    template_dir = project_dir / "contrib" / "templates"
    templates = Environment(loader=FileSystemLoader(template_dir))
    psql_port = os.environ.get("POSTGRES_PORT", "5432")
    psql_conf_host_dir = os.environ.get(
        "POSTGRES_CONF_DIR_HOST", "../storage2/psql/"
    )
    pgdata_container = "/var/lib/postgresql/data"
    config_mount_point = "/etc/postgresql"

    target_dir = Path(psql_conf_host_dir).resolve()
    print(f"Target Directory (Host): {target_dir}")

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
                "LISTEN_ADDRESSES": "*",
                "PORT": psql_port,
                "HBA_FILE": f"{config_mount_point}/pg_hba.conf",
            },
        },
        {"template": "pg_hba.conf", "output": "pg_hba.conf", "context": {}},
    ]

    for config in configs:
        try:
            tmpl = templates.get_template(config["template"])
            rendered_content = tmpl.render(config["context"])
            target_file = target_dir / config["output"]

            print(f"Writing {config['output']}...")
            with open(target_file, "w") as f:
                f.write(rendered_content)
        except Exception as e:
            print(f"Failed: {e}")
            sys.exit(1)

    print("------ Configuration Generated Successfully ------")


if __name__ == "__main__":
    generate_postgres_configs()
