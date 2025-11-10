from abc import ABC, abstractmethod
from typing import Literal, Optional

import httpx
from django.conf import settings
from django.http import HttpRequest
from django.core import signing
from django.utils import timezone
from google_auth_oauthlib.flow import Flow


class OAuthProvider(ABC):
    provider: Literal["google", "github", "orcid"]
    client_id: str
    client_secret: str
    auth_url: str
    token_url: str
    user_url: Optional[str]
    scopes: list[str]

    def __init__(self, request: HttpRequest):
        self.request = request
        self.redirect_url = (
            f"{settings.BACKEND_URL}/api/user/oauth/callback/{self.provider}/"
        )
        if self.provider == "google":
            # Google doesn't allow 0.0.0.0
            self.redirect_url = self.redirect_url.replace(
                "0.0.0.0",
                "localhost",
            )

    @classmethod
    def from_request(
        cls,
        request: HttpRequest,
        provider: Literal["google", "github", "orcid"],
    ) -> "OAuthProvider":
        providers = {
            "github": GithubProvider,
            "google": GoogleProvider,
            "orcid": OrcidProvider,
        }
        provider = providers.get(provider)
        if not provider:
            raise ValueError(f"Unsupported provider: {provider}")
        return provider(request)

    @property
    def state(self):
        payload = {
            "ip": self.request.META.get("REMOTE_ADDR"),
            "ua": self.request.META.get("HTTP_USER_AGENT"),
            "ts": timezone.now().timestamp(),
        }
        return signing.dumps(payload, salt="oauth-state", compress=True)

    def decode_state(self, state: str, max_age: int = 300):
        return signing.loads(state, salt="oauth-state", max_age=max_age)

    @abstractmethod
    def get_auth_url(self) -> str: ...

    @abstractmethod
    def get_user_info(self, access_token: str, token_json: dict): ...

    def get_token(self, code: str) -> str:
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_url,
        }

        with httpx.Client() as client:
            res = client.post(
                self.token_url,
                data=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            res.raise_for_status()
            return res.json()


class GithubProvider(OAuthProvider):
    provider = "github"
    client_id = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_SECRET
    auth_url = "https://github.com/login/oauth/authorize"
    token_url = "https://github.com/login/oauth/access_token"
    user_url = "https://api.github.com/user"
    scopes = ["read:user", "user:email"]

    def get_auth_url(self):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_url,
            "scope": " ".join(self.scopes),
            "state": self.state,
            "allow_signup": "true",
        }
        return f"{self.auth_url}?{httpx.QueryParams(params)}"

    def get_user_info(self, access_token: str, token_json: dict):
        with httpx.Client() as client:
            resp = client.get(
                self.user_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
            )

        resp.raise_for_status()

        user_data = resp.json()

        if not user_data.get("email"):
            raise ValueError("GitHub account has no public email")

        return user_data


class GoogleProvider(OAuthProvider):
    provider = "google"
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_SECRET
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://oauth2.googleapis.com/token"
    user_url = None
    scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    def get_auth_url(self) -> str:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": self.auth_url,
                    "token_uri": self.token_url,
                    "redirect_uris": [self.redirect_url],
                }
            },
            scopes=self.scopes,
        )
        flow.redirect_uri = self.redirect_url
        auth_url, _ = flow.authorization_url(
            prompt="consent",
            access_type="offline",
            state=self.state,
            include_granted_scopes="true",
        )
        return auth_url

    def get_user_info(self, access_token: str, *args, **kwargs):
        with httpx.Client() as client:
            resp = client.get(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()


class OrcidProvider(OAuthProvider):
    provider = "orcid"
    client_id = settings.ORCID_CLIENT_ID
    client_secret = settings.ORCID_SECRET
    auth_url = "https://orcid.org/oauth/authorize"
    token_url = "https://orcid.org/oauth/token"
    user_url = "https://pub.orcid.org/v3.0"
    scopes = ["/authenticate"]

    def get_auth_url(self):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_url,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": self.state,
        }
        return f"{self.auth_url}?{httpx.QueryParams(params)}"

    def get_user_info(self, access_token: str, token_json: dict):
        orcid_id = token_json.get("orcid")
        url = f"{self.user_url}/{orcid_id}/person"
        with httpx.Client() as client:
            res = client.get(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
        res.raise_for_status()
        return res.json()
