import logging
import asyncio
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Optional

import httpx
from asgiref.sync import async_to_sync
from celery import group
from dateutil import parser
from django.utils import timezone
from pydantic import (
    BaseModel,
    field_validator,
    model_validator,
    ValidationError,
)

from mosqlimate.celeryapp import app
from .models import Adm2, ContaOvos

logger = logging.getLogger(__name__)


class ContaOvosSchema(BaseModel):
    counting_id: int
    date: date
    date_collect: Optional[date] = None
    eggs: int
    latitude: Decimal
    longitude: Decimal
    municipality: str
    municipality_code: str
    ovitrap_id: str
    ovitrap_website_id: int
    state_code: str
    state_name: str
    time: datetime
    week: int
    year: int

    @field_validator("time", mode="before")
    @classmethod
    def parse_rfc2822_datetime(cls, v):
        if isinstance(v, str):
            dt = parser.parse(v)
            if dt and timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone=UTC)
            return dt
        return v

    @model_validator(mode="after")
    def check_geographic_bounds(self) -> "ContaOvosSchema":
        if not (Decimal("-90") <= self.latitude <= Decimal("90")):
            raise ValueError(f"Latitude out of bounds: {self.latitude}")
        if not (Decimal("-180") <= self.longitude <= Decimal("180")):
            raise ValueError(f"Longitude out of bounds: {self.longitude}")
        if self.date_collect is None:
            raise ValueError("date_collect is missing")
        return self


async def get_contaovos(dt: date) -> list[ContaOvosSchema]:
    page = 1
    url = "https://contaovos.com/pt-br/api/lastcountingpublic"
    validated_data = []

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
    ) as client:
        while True:
            params = {
                "date_start": str(dt - timedelta(days=1)),
                "date_end": str(dt + timedelta(days=1)),
                "page": page,
            }

            response = await client.get(url, params=params)

            if response.status_code == 429:
                logger.warning(
                    "Rate limit hit on page %s for %s. Sleeping...", page, dt
                )
                await asyncio.sleep(5)
                continue

            response.raise_for_status()
            res = response.json()

            if not res:
                break

            for item in res:
                try:
                    validated_data.append(ContaOvosSchema(**item))
                except (ValidationError, ValueError) as e:
                    logger.warning(
                        "Skipping invalid record %s: %s",
                        item.get("counting_id"),
                        e,
                    )
                    continue

            page += 1

            await asyncio.sleep(1)

    return validated_data


@app.task(
    bind=True,
    rate_limit="1/s",
    autoretry_for=(
        httpx.HTTPError,
        httpx.HTTPStatusError,
        httpx.ReadError,
        httpx.ConnectError,
        httpx.TimeoutException,
    ),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 10},
)
def sync_contaovos_for_date(self, dt_str: str | None = None):
    dt = date.fromisoformat(dt_str) if dt_str else timezone.localdate()

    logger.info("Starting ContaOvos sync for %s", dt)

    try:
        data = async_to_sync(get_contaovos)(dt)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            logger.error("Rate limit hit for %s. Retrying...", dt)
            raise self.retry(exc=e, countdown=60)
        raise e

    if not data:
        logger.warning("No valid ContaOvos data found for %s", dt)
        return f"No data found for {dt}"

    count_created = 0
    count_updated = 0
    count_skipped = 0

    adm2_map = {adm2.geocode: adm2 for adm2 in Adm2.objects.all()}
    incoming_ids = [item.counting_id for item in data]
    existing_ids = set(
        ContaOvos.objects.filter(counting_id__in=incoming_ids).values_list(
            "counting_id", flat=True
        )
    )

    to_create = []
    to_update = []

    for item in data:
        try:
            adm2 = adm2_map.get(item.municipality_code)
            if not adm2:
                count_skipped += 1
                continue

            obj = ContaOvos(
                counting_id=item.counting_id,
                date=item.date,
                date_collect=item.date_collect,
                eggs=item.eggs,
                latitude=item.latitude,
                longitude=item.longitude,
                adm2=adm2,
                ovitrap_id=item.ovitrap_id,
                ovitrap_website_id=item.ovitrap_website_id,
                time=item.time,
                week=item.week,
                year=item.year,
            )

            if item.counting_id in existing_ids:
                to_update.append(obj)
                count_updated += 1
            else:
                to_create.append(obj)
                count_created += 1

        except Exception:
            count_skipped += 1
            logger.exception(
                "Failed processing counting_id=%s", item.counting_id
            )

    if to_create:
        ContaOvos.objects.bulk_create(to_create, batch_size=1000)

    if to_update:
        ContaOvos.objects.bulk_update(
            to_update,
            fields=[
                "date",
                "date_collect",
                "eggs",
                "latitude",
                "longitude",
                "adm2",
                "ovitrap_id",
                "ovitrap_website_id",
                "time",
                "week",
                "year",
            ],
            batch_size=1000,
        )

    result = f"{dt}: {count_created} created, {count_updated} updated, {
        count_skipped
    } skipped"
    logger.info(result)
    return result


@app.task
def backfill_contaovos(start_date: str, end_date: str):
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    if start > end:
        raise ValueError("start_date must be before end_date")

    tasks = []
    current = start
    while current <= end:
        tasks.append(sync_contaovos_for_date.s(current.isoformat()))
        current += timedelta(days=1)

    job = group(tasks)
    result = job.delay()

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "days": len(tasks),
        "group_id": result.id,
    }
