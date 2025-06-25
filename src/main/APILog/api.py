from typing import Optional, Literal
from dateutil import parser

from ninja import Router
from django.db.models.functions import TruncDate
from django.db.models import Count, F


from main.models import APILog

router = Router()


@router.get(
    "/usage-by-endpoint/",
    include_in_schema=False,
)
def usage_by_endpoint(request, start: str, app: Literal["datastore"]):
    logs = (
        APILog.objects.filter(
            endpoint__startswith=f"/api/{app}/",
            date__gte=parser.parse(start),
            # user__is_staff=False TODO: enable it
        )
        .values("endpoint")
        .annotate(count=Count("id"))
        .order_by("endpoint")[:20]
    )
    return {
        log["endpoint"].removeprefix(f"/api/{app}/"): log["count"]
        for log in logs
    }


@router.get(
    "/usage-by-day/",
    include_in_schema=False,
)
def usage_by_day(request, start: str, endpoint: Optional[str] = None):
    if endpoint:
        logs = APILog.objects.filter(
            endpoint=endpoint,
            date__gte=parser.parse(start),
            # user__is_staff=False TODO: enable it
        )
    else:
        logs = APILog.objects.filter(
            date__gte=parser.parse(start),
            # user__is_staff=False TODO: enable it
        )

    return list(
        logs.annotate(day=TruncDate("date"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )


@router.get(
    "/usage-by-user/",
    include_in_schema=False,
)
def usage_by_user(request, start: str, endpoint: Optional[str] = None):
    if endpoint:
        logs = APILog.objects.filter(
            endpoint=endpoint,
            date__gte=parser.parse(start),
            # user__is_staff=False TODO: enable it
        )
    else:
        logs = APILog.objects.filter(
            date__gte=parser.parse(start),
            # user__is_staff=False TODO: enable it
        )

    return list(
        logs.values(
            username=F("user__username"),
            institution=F("user__author__institution"),
        )
        .annotate(count=Count("id"))
        .order_by("-count")
    )
