from typing import Optional
from dateutil import parser

from ninja import Router
from django.db.models.functions import TruncDate
from django.db.models import Count, F


from main.models import APILog

router = Router()


@router.get(
    "/usage-by-day/",
    include_in_schema=False,
)
def usage_by_day(request, start: str, endpoint: Optional[str] = None):
    if endpoint:
        logs = APILog.objects.filter(
            endpoint=endpoint, date__gte=parser.parse(start)
        )
    else:
        logs = APILog.objects.filter(date__gte=parser.parse(start))

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
            endpoint=endpoint, date__gte=parser.parse(start)
        )
    else:
        logs = APILog.objects.filter(date__gte=parser.parse(start))

    return list(
        logs.values(
            username=F("user__username"),
            institution=F("user__author__institution"),
        )
        .annotate(count=Count("id"))
        .order_by("-count")
    )
