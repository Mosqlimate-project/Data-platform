from django.urls import path
from allauth.account.views import logout
from allauth.socialaccount.providers.github.views import (
    oauth2_login,
    oauth2_callback,
)
from django.contrib.auth.decorators import login_required

from .views import ProfileView, redirect_to_user_profile, APIReportView

urlpatterns = [
    path("report/api/<str:app>/", APIReportView.as_view(), name="api_report"),
    path("<str:username>/", ProfileView.as_view(), name="profile"),
    path("accounts/logout/", logout, name="account_logout"),
    path("accounts/github/login/", oauth2_login, name="github_login"),
    path(
        "accounts/github/login/callback/",
        oauth2_callback,
        name="github_callback",
    ),
    path(
        "accounts/profile/",
        login_required(redirect_to_user_profile),
        name="redirect_to_profile",
    ),
]
