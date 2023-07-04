from django.urls import path
from allauth.account.views import logout
from allauth.socialaccount.providers.github.views import oauth2_login, oauth2_callback

urlpatterns = [
    path("accounts/logout/", logout, name="account_logout"),
    path("accounts/github/login/", oauth2_login, name="github_login"),
    path("accounts/github/login/callback/", oauth2_callback, name="github_callback"),
]
