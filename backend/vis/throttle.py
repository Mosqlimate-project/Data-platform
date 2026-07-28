from ninja.throttling import BaseThrottle
from django.core.cache import cache


class SdkThrottle(BaseThrottle):
    """Per-user or per-IP rate throttle for chart endpoints.

    - Staff/superusers bypass throttling entirely.
    - Authenticated users are throttled by their ``rate_limit`` field.
    - Anonymous requests fall back to per-IP throttling (60/min by default).
    """

    rate = "60/m"

    def get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def allow_request(self, request):
        user = getattr(request, "auth", None) or getattr(request, "user", None)

        if user and getattr(user, "is_authenticated", False):
            if (
                getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
                or getattr(user, "rate_limit", "60/m") is None
            ):
                return True

            rate_limit = getattr(user, "rate_limit", self.rate)
            try:
                _limit, period = rate_limit.split("/")
                limit = int(_limit)
            except (ValueError, AttributeError):
                return True

            period_seconds = {"s": 1, "m": 60, "h": 3600, "d": 86400}.get(
                period, 60
            )
            cache_key = f"sdk_throttle:user:{user.pk}"
            current = cache.get(cache_key)

            if current is None:
                cache.set(cache_key, 1, timeout=period_seconds)
                return True

            if current >= limit:
                return False

            try:
                cache.incr(cache_key)
            except ValueError:
                cache.set(cache_key, 1, timeout=period_seconds)

            return True

        ip = self.get_client_ip(request)
        if not ip:
            return True

        _limit, period = self.rate.split("/")
        limit = int(_limit)
        period_seconds = {"s": 1, "m": 60, "h": 3600, "d": 86400}.get(
            period, 60
        )

        cache_key = f"sdk_throttle:ip:{ip}"
        current = cache.get(cache_key)

        if current is None:
            cache.set(cache_key, 1, timeout=period_seconds)
            return True

        if current >= limit:
            return False

        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=period_seconds)

        return True
