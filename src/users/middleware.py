from django.core.cache import cache


class SessionCacheMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.session.session_key:
            request.session.save()
        if request.user.is_authenticated:
            cache.set(
                request.session.session_key,
                request.user.api_key(),
                timeout=3600,
            )
        return self.get_response(request)
