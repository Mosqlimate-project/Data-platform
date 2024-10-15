from django.urls import reverse
from allauth.account.adapter import DefaultAccountAdapter


class RedirectOnLogin(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        username = request.user.username
        if username:
            return reverse("profile", args=[username])
        else:
            return reverse("home")
