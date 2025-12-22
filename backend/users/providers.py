from abc import ABC, abstractmethod
from typing import Literal, Optional

import httpx
from jose import jwt
from django.conf import settings
from django.http import HttpRequest
from django.core import signing
from django.utils import timezone
from google_auth_oauthlib.flow import Flow


class OAuthProvider(ABC):
    provider: Literal["google", "github", "gitlab"]
    redirect_url: str
    client_id: str
    client_secret: str
    auth_url: str
    token_url: str
    user_url: Optional[str]
    scopes: list[str]

    def __init__(self, request: HttpRequest, extra_state: dict = {}):
        self.request = request
        self.extra_state = extra_state
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
        provider: Literal["google", "github", "gitlab"],
        extra_state: dict = {},
    ) -> "OAuthProvider":
        providers = {
            "github": GithubProvider,
            "gitlab": GitlabProvider,
            "google": GoogleProvider,
        }
        provider = providers.get(provider)
        if not provider:
            raise ValueError(f"Unsupported provider: {provider}")
        return provider(request, extra_state=extra_state)

    @property
    def state(self):
        payload = {
            "ip": self.request.META.get("REMOTE_ADDR"),
            "ua": self.request.META.get("HTTP_USER_AGENT"),
            "ts": timezone.now().timestamp(),
            **self.extra_state,
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

        transport = httpx.HTTPTransport(retries=3)

        with httpx.Client(transport=transport, timeout=3.0) as client:
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


class GoogleProvider(OAuthProvider):
    provider = "google"
    redirect_url = (
        f"{settings.BACKEND_URL}/api/user/oauth/callback/{provider}/"
    )
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


class GithubProvider(OAuthProvider):
    provider = "github"
    redirect_url = (
        f"{settings.BACKEND_URL}/api/user/oauth/callback/{provider}/"
    )
    client_id = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_SECRET
    github_app = settings.GITHUB_APP
    github_app_id = settings.GITHUB_APP_ID
    github_private_key = settings.GITHUB_PRIVATE_KEY
    auth_url = "https://github.com/login/oauth/authorize"
    token_url = "https://github.com/login/oauth/access_token"
    user_url = "https://api.github.com/user"
    install_url = f"https://github.com/apps/{github_app}/installations/new"
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

    def has_installations(self, access_token: str) -> bool:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }
        with httpx.Client() as client:
            res = client.get(
                "https://api.github.com/user/installations",
                headers=headers,
                params={"per_page": 1},
            )
            if res.status_code == 200:
                installations = res.json().get("installations", [])
                return len(installations) > 0
        return False

    def get_installation_token(self, installation_id: str):
        now = int(timezone.now().timestamp())
        payload = {
            "iat": now,
            "exp": now + (10 * 60),
            "iss": self.github_app_id,
        }
        encoded_jwt = jwt.encode(
            payload, self.github_private_key.encode(), algorithm="RS256"
        )

        headers = {
            "Authorization": f"Bearer {encoded_jwt}",
            "Accept": "application/vnd.github.v3+json",
        }
        url = f"https://api.github.com/app/installations/{
            installation_id
        }/access_tokens"
        with httpx.Client() as client:
            res = client.post(url, headers=headers)
            res.raise_for_status()
            return res.json()

    def get_user_repos(self, access_token: str):
        repos = []
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

        transport = httpx.HTTPTransport(retries=3)

        with httpx.Client(transport=transport) as client:
            inst_resp = client.get(
                "https://api.github.com/user/installations",
                headers=headers,
                params={"per_page": 100},
            )
            inst_resp.raise_for_status()
            installations = inst_resp.json().get("installations", [])

            for install in installations:
                install_id = install["id"]
                repo_resp = client.get(
                    f"https://api.github.com/user/installations/{
                        install_id
                    }/repositories",
                    headers=headers,
                    params={"per_page": 100},
                )

                if repo_resp.status_code == 200:
                    repos_data = repo_resp.json().get("repositories", [])
                    for r in repos_data:
                        if r.get("permissions", {}).get("admin") is True:
                            repos.append(
                                {
                                    "id": str(r["id"]),
                                    "name": r["full_name"],
                                    "url": r["html_url"].strip("/"),
                                    "private": r["private"],
                                    "provider": "github",
                                    "avatar_url": r["owner"]["avatar_url"],
                                }
                            )

        return repos

    def refresh_access_token(self, refresh_token: str):
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        headers = {"Accept": "application/json"}

        with httpx.Client() as client:
            resp = client.post(
                "https://github.com/login/oauth/access_token",
                data=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

            if "error" in data:
                raise ValueError(
                    f"GitHub Refresh Failed: {data.get('error_description')}"
                )

            return data


class GitlabProvider(OAuthProvider):
    provider = "gitlab"
    client_id = settings.GITLAB_CLIENT_ID
    client_secret = settings.GITLAB_SECRET
    redirect_url = (
        f"{settings.BACKEND_URL}/api/user/oauth/callback/{provider}/"
    )
    auth_url = "https://gitlab.com/oauth/authorize"
    token_url = "https://gitlab.com/oauth/token"
    user_url = "https://gitlab.com/api/v4/user"
    scopes = ["read_user", "read_api"]

    def get_auth_url(self, state: str = None) -> str:
        state = state or self.state
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_url,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state,
        }
        return f"{self.auth_url}?{httpx.QueryParams(params)}"

    def get_user_info(self, access_token: str, token_json: dict):
        with httpx.Client() as client:
            res = client.get(
                self.user_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            res.raise_for_status()
            return res.json()

    def get_user_repos(self, access_token: str):
        repos = []
        headers = {"Authorization": f"Bearer {access_token}"}

        params = {
            "membership": "true",
            "min_access_level": 40,
            "per_page": 100,
            "order_by": "updated_at",
        }

        transport = httpx.HTTPTransport(retries=3)

        with httpx.Client(transport=transport) as client:
            res = client.get(
                "https://gitlab.com/api/v4/projects",
                headers=headers,
                params=params,
            )
            res.raise_for_status()
            projects = res.json()

            for p in projects:
                repos.append(
                    {
                        "id": str(p["id"]),
                        "name": p["path_with_namespace"],
                        "url": p["web_url"].strip("/"),
                        "private": p["visibility"] == "private",
                        "provider": "gitlab",
                        "avatar_url": (
                            p.get("avatar_url")
                            or p.get("namespace", {}).get("avatar_url")
                        ),
                    }
                )

        return repos

    def refresh_access_token(self, refresh_token: str):
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "redirect_uri": self.redirect_url,
        }

        with httpx.Client() as client:
            resp = client.post(self.token_url, data=payload)
            resp.raise_for_status()
            return resp.json()
