from ninja.throttling import BaseThrottle
from django.core.cache import cache


class APIThrottle(BaseThrottle):
    def allow_request(self, request):
        user = getattr(request, "auth", None) or getattr(request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return True

        if (
            getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
            or getattr(user, "rate_limit", "60/m") is None
        ):
            return True

        rate_limit = getattr(user, "rate_limit", "60/m")

        try:
            _limit, period = rate_limit.split("/")
            limit = int(_limit)
        except (ValueError, AttributeError):
            return True

        period_seconds = {"s": 1, "m": 60, "h": 3600, "d": 86400}.get(
            period, 60
        )
        cache_key = f"rate_limit:{user.pk}"

        current_requests = cache.get(cache_key)

        if current_requests is None:
            cache.set(cache_key, 1, timeout=period_seconds)
            return True

        if current_requests >= limit:
            return False

        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=period_seconds)

        return True
