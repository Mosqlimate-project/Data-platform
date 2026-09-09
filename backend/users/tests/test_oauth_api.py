from unittest.mock import MagicMock, patch

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache

from users.jwt import create_access_token
from users.models import OAuthAccount

User = get_user_model()


def make_state(**extra):
    payload = {
        "ip": "127.0.0.1",
        "ua": "test",
        "next": "/dashboard",
        **extra,
    }
    return signing.dumps(payload, salt="oauth-state", compress=True)


class OAuthCallbackAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="oauthuser",
            email="oauth@test.com",
            password="pass",
        )
        self.jwt = {
            "HTTP_AUTHORIZATION": "Bearer "
            + create_access_token({"sub": str(self.user.pk)})
        }

    def _mock_client(self, **kw):
        client = MagicMock()
        client.decode_state.return_value = kw.pop(
            "state_data", {"next": "/dash"}
        )
        client.get_token.return_value = kw.pop(
            "token_data",
            {"access_token": "at", "refresh_token": "rt", "expires_in": 3600},
        )
        client.get_user_info.return_value = kw.pop(
            "raw_info",
            {"id": "123", "login": "oauthuser", "email": "oauth@test.com"},
        )
        client.install_url = "https://github.com/apps/x/install"
        return client

    def _mock_adapter(self, **kw):
        adapter = MagicMock()
        adapter.provider_id = kw.pop("provider_id", "123")
        adapter.email = kw.pop("email", "oauth@test.com")
        adapter.username = kw.pop("username", "oauthuser")
        adapter.first_name = "O"
        adapter.last_name = "A"
        adapter.avatar_url = kw.pop("avatar_url", "")
        return adapter

    def test_callback_new_user_redirects_to_register(self):
        client = self._mock_client(
            email="newuser@test.com", username="newuser"
        )
        adapter = self._mock_adapter(
            provider_id="999", email="newuser@test.com", username="newuser"
        )
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.OAuthAdapter.from_request", return_value=adapter):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 302)
        self.assertIn("/oauth/register", r["Location"])

    def test_callback_existing_account_updates(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="old",
        )
        client = self._mock_client()
        adapter = self._mock_adapter()
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch(
            "users.api.OAuthAdapter.from_request", return_value=adapter
        ), patch(
            "users.api.download_image"
        ):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 302)
        self.user.refresh_from_db()
        acc = OAuthAccount.objects.get(provider="github", provider_id="123")
        self.assertEqual(acc.access_token, "at")

    def test_callback_existing_email_links_account(self):
        client = self._mock_client()
        adapter = self._mock_adapter(provider_id="777")
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.OAuthAdapter.from_request", return_value=adapter):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 302)
        self.assertTrue(
            OAuthAccount.objects.filter(
                provider="github", provider_id="777"
            ).exists()
        )

    def test_callback_invalid_state(self):
        client = MagicMock()
        client.decode_state.side_effect = signing.BadSignature
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": "bad"},
            )
        self.assertEqual(r.status_code, 400)

    def test_callback_missing_access_token(self):
        client = self._mock_client(
            token_data={"refresh_token": "rt", "expires_in": 1}
        )
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 400)

    def test_callback_http_error(self):
        import httpx

        client = MagicMock()
        client.decode_state.return_value = {"next": ""}
        client.get_token.side_effect = httpx.HTTPError("boom")
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 400)

    def test_callback_generic_error(self):
        client = MagicMock()
        client.decode_state.return_value = {"next": ""}
        client.get_token.side_effect = RuntimeError("boom")
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 400)

    def test_install_returns_url(self):
        with patch("users.api.OAuthProvider.from_request") as mf:
            client = MagicMock()
            client.install_url = "https://github.com/apps/x/install"
            client.state = "st"
            mf.return_value = client
            r = self.client.get("/api/user/oauth/install/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertIn("install?state=st", r.json()["url"])

    def test_install_callback_no_user_401(self):
        r = self.client.get(
            "/api/user/oauth/install/github/callback/",
        )
        self.assertEqual(r.status_code, 401)

    def test_install_callback_user_no_account_404(self):
        with patch("users.api.decode_token") as dt:
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 404)

    def test_install_callback_success(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
        )
        client = MagicMock()
        client.decode_state.return_value = {"next": "/x"}
        client.get_installation_token.return_value = {
            "token": "it",
            "expires_at": "2026-01-01",
        }
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                {"installation_id": "i1", "state": make_state()},
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 302)
        acc = OAuthAccount.objects.get(provider="github", provider_id="123")
        self.assertEqual(acc.installation_id, "i1")

    def test_install_callback_missing_installation_id(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
        )
        client = MagicMock()
        client.decode_state.return_value = {"next": "/x"}
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                MagicMock(status_code=200, json=lambda: {"installations": []})
            )
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 400)

    def test_install_callback_fetches_installation(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="at",
        )
        client = MagicMock()
        client.decode_state.return_value = {"next": "/x"}
        client.get_installation_token.return_value = {
            "token": "it",
            "expires_at": "2026-01-01",
        }
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                MagicMock(
                    status_code=200,
                    json=lambda: {"installations": [{"id": "fetched"}]},
                )
            )
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 302)
        acc = OAuthAccount.objects.get(provider="github", provider_id="123")
        self.assertEqual(acc.installation_id, "fetched")

    def test_install_callback_no_token_400(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
        )
        client = MagicMock()
        client.decode_state.return_value = {"next": "/x"}
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 400)

    def test_oauth_decode(self):
        data = signing.dumps({"action": "x"}, salt="oauth-callback")
        r = self.client.get("/api/user/oauth/decode/", {"data": data})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["action"], "x")

    def test_oauth_decode_invalid(self):
        r = self.client.get("/api/user/oauth/decode/", {"data": "garbage"})
        self.assertEqual(r.status_code, 400)
