from dateutil import parser

from ninja import Router
from django.db.models.functions import TruncDate
from django.db.models import Count


from main.models import APILog

router = Router()


@router.get(
    "/usage-by-day/",
    include_in_schema=False,
)
def usage_by_day(request, endpoint: str, start: str):
    return list(
        APILog.objects.filter(endpoint=endpoint, date__gte=parser.parse(start))
        .annotate(day=TruncDate("date"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
