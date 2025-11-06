from django.urls import path, include
from allauth.account.views import logout
from allauth.socialaccount.providers.github.views import (
    oauth2_login as github_login,
    oauth2_callback as github_callback,
)
from allauth.socialaccount.providers.google.views import (
    oauth2_login as google_login,
    oauth2_callback as google_callback,
)
from allauth.socialaccount.providers.orcid.views import (
    oauth2_login as orcid_login,
    oauth2_callback as orcid_callback,
)
from django.contrib.auth.decorators import login_required

from .views import ProfileView, redirect_to_user_profile, APIReportView

urlpatterns = [
    path("report/api/<str:app>/", APIReportView.as_view(), name="api_report"),
    path("<str:username>/", ProfileView.as_view(), name="profile"),
    path("accounts/", include("allauth.urls")),
    path(
        "accounts/profile/",
        login_required(redirect_to_user_profile),
        name="redirect_to_profile",
    ),
    path("accounts/logout/", logout, name="account_logout"),
    path("accounts/github/login/", github_login, name="github_login"),
    path(
        "accounts/github/login/callback/",
        github_callback,
        name="github_callback",
    ),
    path("accounts/google/login/", google_login, name="google_login"),
    path(
        "accounts/google/login/callback/",
        google_callback,
        name="google_callback",
    ),
    path("accounts/orcid/login/", orcid_login, name="orcid_login"),
    path(
        "accounts/orcid/login/callback/", orcid_callback, name="orcid_callback"
    ),
]
