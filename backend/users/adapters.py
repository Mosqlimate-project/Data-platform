from abc import ABC, abstractmethod
from typing import Literal

from django.http import HttpRequest
from django.core.cache import cache
from django.conf import settings
from allauth.account.adapter import DefaultAccountAdapter


class OAuthAdapter(ABC):
    def __init__(self, request, raw_data: dict):
        self.request = request
        self.data = raw_data

    @classmethod
    def from_request(
        cls,
        request: HttpRequest,
        provider: Literal["google", "github", "gitlab"],
        data: dict,
    ) -> "OAuthAdapter":
        adapters = {
            "github": GithubAdapter,
            "google": GoogleAdapter,
            "gitlab": GitlabAdapter,
        }
        adapter = adapters.get(provider)
        if not adapter:
            raise ValueError(f"Unsupported provider: {provider}")
        return adapter(request, data)

    @property
    @abstractmethod
    def provider_id(self) -> str: ...

    @property
    @abstractmethod
    def email(self) -> str: ...

    @property
    @abstractmethod
    def username(self) -> str: ...

    @property
    @abstractmethod
    def first_name(self) -> str: ...

    @property
    @abstractmethod
    def last_name(self) -> str: ...

    @property
    @abstractmethod
    def avatar_url(self) -> str: ...


class GoogleAdapter(OAuthAdapter):
    @property
    def provider_id(self) -> str:
        _id = self.data.get("id", None)
        if not _id:
            raise ValueError("User info must include an unique identifier")
        return str(_id)

    @property
    def email(self) -> str:
        email = self.data.get("email")
        if not email:
            raise ValueError("User info must include a public email")
        return email

    @property
    def username(self) -> str:
        return ""

    @property
    def first_name(self) -> str:
        name = self.data.get("given_name", "")
        if not name:
            name = self.data.get("name", "")
        return name

    @property
    def last_name(self) -> str:
        return self.data.get("family_name", "")

    @property
    def avatar_url(self) -> str:
        return self.data.get("picture", "")


class GithubAdapter(OAuthAdapter):
    @property
    def provider_id(self) -> str:
        _id = self.data.get("id")
        if not _id:
            raise ValueError("User info must include an unique identifier")
        return str(_id)

    @property
    def email(self) -> str:
        email = self.data.get("email") or self.data.get("notification_email")
        if not email:
            raise ValueError("User info must include a public email")
        return email

    @property
    def username(self) -> str:
        return self.data.get("login", "")

    @property
    def first_name(self) -> str:
        return self.data.get("name", "").split(" ")[0]

    @property
    def last_name(self) -> str:
        return " ".join(self.data.get("name", "").split(" ")[1:])

    @property
    def avatar_url(self) -> str:
        return self.data.get("avatar_url", "")


class GitlabAdapter(OAuthAdapter):
    @property
    def provider_id(self) -> str:
        return str(self.data.get("id"))

    @property
    def email(self) -> str:
        email = self.data.get("email")
        if not email:
            raise ValueError("GitLab account has no public email")
        return email

    @property
    def username(self) -> str:
        return self.data.get("username", "")

    @property
    def first_name(self) -> str:
        name = self.data.get("name", "").strip()
        if not name:
            return ""
        return name.split()[0]

    @property
    def last_name(self) -> str:
        name = self.data.get("name", "").strip()
        if not name:
            return ""
        parts = name.split()
        if len(parts) > 1:
            return " ".join(parts[1:])
        return ""

    @property
    def avatar_url(self) -> str:
        return self.data.get("avatar_url", "")


class RedirectOnLogin(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        user = request.user
        session = request.session

        if not session.session_key:
            session.save()

        if user:
            cache.set(session.session_key, user.api_key(), timeout=3600)

        return getattr(settings, "FRONTEND_URL")
