import json
from unittest.mock import MagicMock, patch

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache

from users.jwt import create_access_token, create_refresh_token
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

    def test_callback_no_expires_or_refresh(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="old",
        )
        client = self._mock_client(token_data={"access_token": "at"})
        adapter = self._mock_adapter()
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.OAuthAdapter.from_request", return_value=adapter):
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 302)
        acc = OAuthAccount.objects.get(provider="github", provider_id="123")
        self.assertEqual(acc.access_token, "at")
        self.assertIsNone(acc.access_token_expires_at)
        self.assertIsNone(acc.refresh_token)

    def test_callback_existing_email_downloads_avatar(self):
        client = self._mock_client(raw_info={"id": "321"})
        adapter = self._mock_adapter(
            provider_id="321", avatar_url="http://av/a.jpg"
        )
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch(
            "users.api.OAuthAdapter.from_request", return_value=adapter
        ), patch(
            "users.api.download_image"
        ) as dl:
            r = self.client.get(
                "/api/user/oauth/callback/github/",
                {"code": "c", "state": make_state()},
            )
        self.assertEqual(r.status_code, 302)
        dl.assert_called_once()

    def test_callback_adapter_no_email(self):
        client = self._mock_client()
        adapter = self._mock_adapter(
            provider_id="888", email=None, username="nouser"
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


class OAuthRegisterTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="reguser", email="reg@test.com", password="pass"
        )

    def _oauth_signed(self, **kw):
        payload = {
            "provider": "github",
            "provider_id": "r1",
            "raw_info": {},
            "access_token": "at",
            "refresh_token": "rt",
        }
        payload.update(kw)
        return signing.dumps(payload, salt="oauth-callback")

    def _post(self, payload):
        return self.client.post(
            "/api/user/register/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_register_existing_downloads_avatar(self):
        data = self._oauth_signed(avatar_url="http://av/a.jpg")
        with patch("users.api.download_image") as dl:
            r = self._post(
                {
                    "username": "reguser",
                    "email": "reg@test.com",
                    "password": "pass",
                    "first_name": "R",
                    "last_name": "L",
                    "oauth_data": data,
                }
            )
        self.assertEqual(r.status_code, 200)
        dl.assert_called_once()

    def test_register_existing_with_expiry(self):
        data = self._oauth_signed(
            access_token_expires_at="2026-01-01T00:00:00+00:00",
        )
        r = self._post(
            {
                "username": "reguser",
                "email": "reg@test.com",
                "password": "pass",
                "first_name": "R",
                "last_name": "L",
                "oauth_data": data,
            }
        )
        self.assertEqual(r.status_code, 200)

    def test_register_new_with_expiry(self):
        data = self._oauth_signed(
            avatar_url="http://av/a.jpg",
            access_token_expires_at="2026-01-01T00:00:00+00:00",
        )
        with patch("users.api.download_image") as dl:
            r = self._post(
                {
                    "username": "newoauth",
                    "email": "new@test.com",
                    "password": "pass",
                    "first_name": "R",
                    "last_name": "L",
                    "oauth_data": data,
                }
            )
        self.assertEqual(r.status_code, 201)
        dl.assert_called_once()
        acc = OAuthAccount.objects.get(provider="github", provider_id="r1")
        self.assertEqual(acc.user.username, "newoauth")

    def test_register_new_without_avatar(self):
        data = self._oauth_signed()
        r = self._post(
            {
                "username": "noavatarauth",
                "email": "na@test.com",
                "password": "pass",
                "first_name": "R",
                "last_name": "L",
                "oauth_data": data,
            }
        )
        self.assertEqual(r.status_code, 201)

    def test_install_callback_via_code(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="old",
        )
        client = MagicMock()
        client.decode_state.return_value = {"next": "/x"}
        client.get_token.return_value = {"access_token": "newtok"}
        client.get_installation_token.return_value = {
            "token": "it",
            "expires_at": "2026-01-01 00:00:00+00:00",
        }
        adapter = MagicMock()
        adapter.provider_id = "123"
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch(
            "users.api.OAuthAdapter.from_request", return_value=adapter
        ), patch(
            "users.api.httpx.Client"
        ) as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                MagicMock(
                    status_code=200,
                    json=lambda: {"installations": [{"id": "f"}]},
                )
            )
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                {"code": "c", "installation_id": "i2"},
            )
        self.assertEqual(r.status_code, 302)
        acc = OAuthAccount.objects.get(provider="github", provider_id="123")
        self.assertEqual(acc.access_token, "newtok")
        self.assertEqual(acc.installation_id, "i2")

    def test_install_callback_code_errors_401(self):
        with patch("users.api.OAuthProvider.from_request") as mf:
            client = MagicMock()
            client.get_token.side_effect = RuntimeError("boom")
            mf.return_value = client
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                {"code": "c"},
            )
        self.assertEqual(r.status_code, 401)

    def test_install_callback_refresh_type_cookie_401(self):
        tok = create_refresh_token({"sub": str(self.user.pk)})
        r = self.client.get(
            "/api/user/oauth/install/github/callback/",
            HTTP_COOKIE=f"access_token={tok}",
        )
        self.assertEqual(r.status_code, 401)

    def test_install_callback_cookie_deleted_user_401(self):
        other = User.objects.create_user(
            username="ghost", email="ghost@test.com", password="p"
        )
        User.objects.filter(pk=other.pk).delete()
        with patch("users.api.decode_token") as dt:
            dt.return_value = {"type": "access", "sub": str(other.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 401)

    def test_install_callback_code_no_access_token_401(self):
        client = MagicMock()
        client.get_token.return_value = {}
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                {"code": "c"},
            )
        self.assertEqual(r.status_code, 401)

    def test_install_callback_state_decode_error(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="at",
        )
        client = MagicMock()
        client.decode_state.side_effect = Exception("bad state")
        client.get_installation_token.return_value = {
            "token": "it",
            "expires_at": "2026-01-01 00:00:00+00:00",
        }
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                {"installation_id": "i1", "state": "whatever"},
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 302)

    def test_install_callback_fetch_non_200(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="at",
        )
        client = MagicMock()
        with patch("users.api.decode_token") as dt, patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ), patch("users.api.httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                MagicMock(status_code=500)
            )
            dt.return_value = {"type": "access", "sub": str(self.user.pk)}
            r = self.client.get(
                "/api/user/oauth/install/github/callback/",
                HTTP_COOKIE="access_token=xyz",
            )
        self.assertEqual(r.status_code, 400)

    def test_install_callback_fetch_empty_installations(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="at",
        )
        client = MagicMock()
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

    def test_oauth_decode(self):
        data = signing.dumps({"action": "x"}, salt="oauth-callback")
        r = self.client.get("/api/user/oauth/decode/", {"data": data})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["action"], "x")

    def test_oauth_decode_invalid(self):
        r = self.client.get("/api/user/oauth/decode/", {"data": "garbage"})
        self.assertEqual(r.status_code, 400)
