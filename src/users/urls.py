from django.urls import path
from allauth.account.views import logout
from allauth.socialaccount.providers.github.views import oauth2_login, oauth2_callback
from django.contrib.auth.decorators import login_required

from . import views

urlpatterns = [
    path("<username>/", views.profile, name="profile"),
    path("accounts/logout/", logout, name="account_logout"),
    path("accounts/github/login/", oauth2_login, name="github_login"),
    path("accounts/github/login/callback/", oauth2_callback, name="github_callback"),
    path(
        "accounts/profile/",
        login_required(views.redirect_to_user_profile),
        name="redirect_to_profile",
    ),
    path("update_author_info/", views.update_author_info, name="update_author_info"),
]
