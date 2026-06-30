import gzip
import logging
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from celery.schedules import crontab
from django.conf import settings
from django.utils import timezone

from mosqlimate.celeryapp import app

logger = logging.getLogger(__name__)


app.conf.beat_schedule = {
    "update-prediction-scores-weekly": {
        "task": "registry.tasks.update_prediction_scores",
        "schedule": crontab(day_of_week=5, hour=3, minute=0),
    },
    "update-contaovos-daily": {
        "task": "datastore.tasks.sync_contaovos_for_date",
        "schedule": crontab(hour=1, minute=0),
    },
    "backup-databases-daily": {
        "task": "main.tasks.backup_databases",
        "schedule": crontab(hour=23, minute=0),
    },
}

BACKUP_RETENTION_DAYS = 30


def _pg_dump(db_config: dict, output_path: Path) -> bool:
    env = os.environ.copy()
    env["PGPASSWORD"] = db_config["PASSWORD"]
    cmd = [
        "pg_dump",
        "-h",
        db_config["HOST"],
        "-p",
        str(db_config["PORT"]),
        "-U",
        db_config["USER"],
        "-d",
        db_config["NAME"],
        "--no-owner",
        "--no-acl",
    ]

    try:
        with gzip.open(output_path, "wb") as f:
            result = subprocess.run(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            if result.returncode != 0:
                stderr = result.stderr.decode(errors="replace")
                logger.error(
                    "pg_dump failed for %s: %s", db_config["NAME"], stderr
                )
                return False
            f.write(result.stdout)
        return True
    except Exception:
        logger.exception("pg_dump failed for %s", db_config["NAME"])
        return False


def _cleanup_old_backups(backup_dir: Path, retention_days: int) -> None:
    cutoff = timezone.now() - timedelta(days=retention_days)
    for f in backup_dir.glob("*.sql.gz"):
        try:
            mtime = datetime.fromtimestamp(
                f.stat().st_mtime, tz=timezone.get_current_timezone()
            )
            if mtime < cutoff:
                f.unlink()
                logger.info("Removed old backup: %s", f.name)
        except Exception:
            logger.exception("Failed to remove old backup: %s", f)


@app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def backup_databases(self) -> dict:
    backup_dir = Path(settings.BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = timezone.localtime().strftime("%Y%m%d_%H%M%S")
    results = {}

    db_config = settings.DATABASES["default"]

    filename = f"{timestamp}.sql.gz"
    output_path = backup_dir / filename

    success = _pg_dump(db_config, output_path)
    results = {
        "success": success,
        "file": str(output_path) if success else None,
    }

    if success:
        logger.info("Backup successful: %s", output_path)

    _cleanup_old_backups(backup_dir, BACKUP_RETENTION_DAYS)

    return results
