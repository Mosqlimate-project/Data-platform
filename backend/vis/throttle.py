from ninja.throttling import BaseThrottle
from django.core.cache import cache


class SdkThrottle(BaseThrottle):
    """Per-IP rate throttle for public SDK chart endpoints."""

    rate = "60/m"

    def get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def allow_request(self, request):
        ip = self.get_client_ip(request)
        if not ip:
            return True

        _limit, period = self.rate.split("/")
        limit = int(_limit)
        period_seconds = {"s": 1, "m": 60, "h": 3600, "d": 86400}.get(
            period, 60
        )

        cache_key = f"sdk_throttle:{ip}"
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
