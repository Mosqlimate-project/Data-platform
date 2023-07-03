# from django.conf import settings
from allauth.account.adapter import DefaultAccountAdapter


class RedirectOnLogin(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        path = "/accounts/{username}/"
        return path.format(username=request.user.username)
