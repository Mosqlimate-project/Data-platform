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
        provider: Literal["google", "github", "orcid"],
        data: dict,
    ) -> "OAuthAdapter":
        adapters = {
            "github": GithubAdapter,
            "google": GoogleAdapter,
            "orcid": OrcidAdapter,
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
    def first_name(self) -> str:
        return self.data.get("name", "").split(" ")[0]

    @property
    def last_name(self) -> str:
        return " ".join(self.data.get("name", "").split(" ")[1:])

    @property
    def avatar_url(self) -> str:
        return self.data.get("avatar_url", "")


class OrcidAdapter(OAuthAdapter):
    @property
    def provider_id(self) -> str:
        info = self.data.get("name")
        if not isinstance(info, dict):
            raise ValueError("Invalid ORCID response: missing 'name' field")
        path = info.get("path")
        if not path:
            raise ValueError("User info must include an unique identifier")
        return path

    @property
    def email(self) -> str:
        emails = self.data.get("emails", {}).get("email", [])
        primary = next((e for e in emails if e.get("primary")), None)
        if not primary or not primary.get("email"):
            raise ValueError("User info must include a public email")
        return primary["email"]

    @property
    def first_name(self) -> str:
        return (
            self.data.get("name", {}).get("given-names", {}).get("value", "")
        )

    @property
    def last_name(self) -> str:
        return (
            self.data.get("name", {}).get("family-name", {}).get("value", "")
        )

    @property
    def avatar_url(self) -> str:
        # ORCID doesn't have a profile picture
        return ""


class RedirectOnLogin(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        user = request.user
        session = request.session

        if not session.session_key:
            session.save()

        if user:
            cache.set(session.session_key, user.api_key(), timeout=3600)

        return getattr(settings, "FRONTEND_URL")
