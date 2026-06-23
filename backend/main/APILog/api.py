from typing import Optional, Literal, List
from dateutil import parser

from ninja.errors import HttpError
from pydantic import UUID4
from ninja import Router, Schema
from django.db.models.functions import TruncDate
from django.db.models import Count, F
from django.contrib.auth import get_user_model
from django.utils import timezone


from main.models import APILog
from users.auth import AdminJWTAuth

router = Router(auth=AdminJWTAuth())
User = get_user_model()


class UserOutSchema(Schema):
    id: int
    username: str
    email: str
    name: Optional[str] = None
    is_active: bool
    is_staff: bool
    rate_limit: str
    uuid: UUID4
    homepage: Optional[str] = None


class UserUpdateSchema(Schema):
    is_active: Optional[bool] = None
    rate_limit: Optional[str] = None


class LiveLogOutSchema(Schema):
    username: str
    method: str
    endpoint: str
    count: int
    latest_timestamp: str


@router.get(
    "/users/",
    response=List[UserOutSchema],
    include_in_schema=False,
)
def list_all_users(request):
    return User.objects.all()


@router.get("/usage/", include_in_schema=False)
def usage_stats(
    request,
    start: str,
    group_by: Literal["endpoint", "day", "user", ""],
    endpoint: Optional[str] = None,
    app: Optional[Literal["datastore"]] = None,
):
    logs = APILog.objects.filter(date__gte=parser.parse(start))

    if endpoint:
        logs = logs.filter(endpoint=endpoint)

    if group_by == "":
        total_requests = logs.count()
        unique_users = logs.values("user").distinct().count()
        unique_endpoints = logs.values("endpoint").distinct().count()

        apps_tracked = 0
        if app:
            apps_tracked = (
                logs.filter(endpoint__startswith=f"/api/{app}/")
                .values("endpoint")
                .distinct()
                .count()
            )
        else:
            apps_tracked = (
                logs.filter(endpoint__startswith="/api/")
                .values("endpoint")
                .distinct()
                .count()
            )

        return {
            "total_requests": total_requests,
            "unique_users_count": unique_users,
            "unique_endpoints_count": unique_endpoints,
            "application_scope_count": apps_tracked,
        }

    if group_by == "endpoint":
        if app:
            logs = logs.filter(endpoint__startswith=f"/api/{app}/")

        logs = (
            logs.values("endpoint")
            .annotate(count=Count("id"))
            .order_by("endpoint")[:20]
        )

        if app:
            return {
                log["endpoint"].removeprefix(f"/api/{app}/"): log["count"]
                for log in logs
            }
        return {log["endpoint"]: log["count"] for log in logs}

    if group_by == "day":
        return list(
            logs.annotate(day=TruncDate("date"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

    if group_by == "user":
        return list(
            logs.values(
                username=F("user__username"),
            )
            .annotate(count=Count("id"))
            .order_by("-count")
        )


@router.patch(
    "/users/{user_id}/", response=UserOutSchema, include_in_schema=False
)
def update_user_account(request, user_id: int, data: UserUpdateSchema):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")

    if user.is_staff or user.is_superuser:
        raise HttpError(403, "Cannot modify staff accounts.")

    update_fields = []

    if data.is_active is not None:
        user.is_active = data.is_active
        update_fields.append("is_active")

    if data.rate_limit is not None:
        user.rate_limit = data.rate_limit
        update_fields.append("rate_limit")

    if update_fields:
        user.save(update_fields=update_fields)

    return user


@router.get(
    "/history/",
    response=List[LiveLogOutSchema],
    include_in_schema=False,
)
def get_live_condensed_history(request, limit: int = 100):
    if limit not in [50, 100, 300]:
        limit = 100

    raw_logs = (
        APILog.objects.select_related("user")
        .order_by("-date")
        .values(
            "method",
            "endpoint",
            username=F("user__username"),
            timestamp=F("date"),
        )[: limit * 2]
    )

    condensed_logs = []

    for log in reversed(raw_logs):
        base_endpoint = log["endpoint"].split("?")[0]

        if condensed_logs:
            last_entry = condensed_logs[-1]

            if (
                last_entry["username"] == log["username"]
                and last_entry["method"] == log["method"]
                and last_entry["endpoint"] == base_endpoint
            ):
                last_entry["count"] += 1
                last_entry["latest_timestamp"] = log["timestamp"].isoformat()
                continue

        condensed_logs.append(
            {
                "username": log["username"] or "Anonymous",
                "method": log["method"],
                "endpoint": base_endpoint,
                "count": 1,
                "latest_timestamp": (
                    log["timestamp"]
                    .astimezone(timezone.get_current_timezone())
                    .isoformat()
                ),
            }
        )

    condensed_logs.reverse()
    return condensed_logs[:limit]
