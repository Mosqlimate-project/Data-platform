from django.urls import reverse
from django.core.cache import cache
from allauth.account.adapter import DefaultAccountAdapter


class RedirectOnLogin(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        user = request.user
        session = request.session

        if not session.session_key:
            session.save()

        if user:
            cache.set(session.session_key, user.api_key(), timeout=3600)
            return reverse("profile", args=[user.username])
        else:
            return reverse("home")
