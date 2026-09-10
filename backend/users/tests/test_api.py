import json
import tempfile
from unittest.mock import MagicMock, patch

from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache

from users.jwt import (
    create_access_token,
    create_refresh_token,
)

User = get_user_model()


class UsersAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="apitest",
            email="api@test.com",
            password="secret123",
            is_active=True,
        )
        self.access = create_access_token({"sub": str(self.user.pk)})
        self.refresh = create_refresh_token({"sub": str(self.user.pk)})
        self.jwt = {"HTTP_AUTHORIZATION": f"Bearer {self.access}"}

    def test_check_username_available(self):
        r = self.client.get(
            "/api/user/check-username/", {"username": "newuser"}
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["available"])

    def test_check_username_taken(self):
        r = self.client.get(
            "/api/user/check-username/", {"username": "APITEST"}
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["available"])

    def test_check_email_available(self):
        r = self.client.get("/api/user/check-email/", {"email": "x@y.com"})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["available"])

    def test_check_email_taken(self):
        r = self.client.get(
            "/api/user/check-email/", {"email": "API@test.com"}
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["available"])

    def test_create_temp_user(self):
        r = self.client.post("/api/user/create-temp-user/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "created")

    def test_create_temp_user_retrieved(self):
        self.client.post("/api/user/create-temp-user/")
        r = self.client.post("/api/user/create-temp-user/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "retrieved")

    def test_rate_limit_with_user(self):
        r = self.client.get(
            "/api/user/rate-limit/",
            HTTP_X_UID_KEY=self.user.api_key(),
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["rate_limit"], self.user.rate_limit)

    def test_rate_limit_staff_unlimited(self):
        admin = User.objects.create_superuser(
            username="adminx", email="a@test.com", password="pass"
        )
        r = self.client.get(
            "/api/user/rate-limit/", HTTP_X_UID_KEY=admin.api_key()
        )
        self.assertEqual(r.json()["rate_limit"], "unlimited")

    def test_rate_limit_temp_user(self):
        self.client.post("/api/user/create-temp-user/")
        r = self.client.get("/api/user/rate-limit/")
        self.assertEqual(r.status_code, 200)

    def test_rate_limit_no_token_no_temp(self):
        from django.core.cache import cache

        cache.clear()
        with patch("users.api.get_client_ip", return_value="10.0.0.99"):
            r = self.client.get("/api/user/rate-limit/")
        self.assertEqual(r.status_code, 400)

    def test_connected_providers(self):
        r = self.client.get("/api/user/oauth/connections/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    def test_oauth_login(self):
        with patch("users.api.OAuthProvider.from_request") as mock_factory:
            client = MagicMock()
            client.get_auth_url.return_value = "https://auth.example"
            mock_factory.return_value = client
            r = self.client.get("/api/user/oauth/login/github/")
        self.assertEqual(r.status_code, 302)
        self.assertEqual(r["Location"], "https://auth.example")

    def test_me(self):
        r = self.client.get("/api/user/me/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], "apitest")

    def test_me_superuser_sets_staff(self):
        admin = User.objects.create_superuser(
            username="adminsu", email="su@test.com", password="pass"
        )
        tok = create_access_token({"sub": str(admin.pk)})
        r = self.client.get(
            "/api/user/me/", HTTP_AUTHORIZATION=f"Bearer {tok}"
        )
        self.assertEqual(r.status_code, 200)

    def test_api_key(self):
        r = self.client.get("/api/user/api-key/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["api_key"], self.user.api_key())

    def test_refresh_api_key(self):
        old = self.user.api_key()
        r = self.client.post("/api/user/api-key/refresh/", **self.jwt)
        self.assertEqual(r.status_code, 201)
        self.assertNotEqual(r.json()["api_key"], old)

    def test_get_sdk_key(self):
        r = self.client.get("/api/user/sdk-key/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertIn("sdk_key", r.json())

    def test_rotate_sdk_key(self):
        r = self.client.post("/api/user/sdk-key/rotate/", **self.jwt)
        self.assertEqual(r.status_code, 201)
        self.assertIn("sdk_key", r.json())

    def test_login_with_username(self):
        r = self.client.post(
            "/api/user/login/",
            data=json.dumps(
                {"identifier": "apitest", "password": "secret123"}
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("access_token", r.json())

    def test_login_with_email(self):
        r = self.client.post(
            "/api/user/login/",
            data=json.dumps(
                {"identifier": "api@test.com", "password": "secret123"}
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)

    def test_login_email_not_registered(self):
        r = self.client.post(
            "/api/user/login/",
            data=json.dumps(
                {"identifier": "nobody@test.com", "password": "x"}
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    def test_login_wrong_password(self):
        r = self.client.post(
            "/api/user/login/",
            data=json.dumps({"identifier": "apitest", "password": "wrong"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    def _reg_payload(self, **kw):
        payload = {
            "username": "brandnew",
            "email": "brand@test.com",
            "password": "password1",
            "first_name": "F",
            "last_name": "L",
        }
        payload.update(kw)
        return payload

    def _post_register(self, payload):
        return self.client.post(
            "/api/user/register/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_register_new_user(self):
        r = self._post_register(self._reg_payload())
        self.assertEqual(r.status_code, 201)
        self.assertIn("access_token", r.json())

    def test_register_email_taken(self):
        r = self._post_register(
            self._reg_payload(username="other", email="api@test.com")
        )
        self.assertEqual(r.status_code, 400)

    def test_register_username_taken(self):
        r = self._post_register(
            self._reg_payload(username="apitest", email="other@test.com")
        )
        self.assertEqual(r.status_code, 400)

    def test_register_invalid_oauth_data(self):
        r = self._post_register(
            self._reg_payload(
                username="x1", email="x1@test.com", oauth_data="garbage"
            )
        )
        self.assertEqual(r.status_code, 400)

    def test_register_with_oauth(self):
        oauth_data = self._make_oauth_signed()
        r = self._post_register(
            self._reg_payload(
                username="oauthuser",
                email="oauth@test.com",
                oauth_data=oauth_data,
            )
        )
        self.assertEqual(r.status_code, 201)

    def test_register_existing_user_with_oauth(self):
        oauth_data = self._make_oauth_signed()
        r = self._post_register(
            self._reg_payload(
                username="apitest",
                email="api@test.com",
                oauth_data=oauth_data,
            )
        )
        self.assertEqual(r.status_code, 200)

    def _make_oauth_signed(self):
        from django.core import signing

        return signing.dumps(
            {
                "provider": "github",
                "provider_id": "123",
                "raw_info": {},
                "access_token": "tok",
                "refresh_token": "ref",
            },
            salt="oauth-callback",
        )

    def test_refresh_token_ok(self):
        r = self.client.post(
            "/api/user/refresh/",
            data=json.dumps({"refresh_token": self.refresh}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)

    def test_refresh_token_invalid(self):
        r = self.client.post(
            "/api/user/refresh/",
            data=json.dumps({"refresh_token": "bad"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 401)

    def test_refresh_token_user_not_found(self):
        tok = create_refresh_token({"sub": "99999"})
        r = self.client.post(
            "/api/user/refresh/",
            data=json.dumps({"refresh_token": tok}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 401)

    def test_profile_get(self):
        r = self.client.get("/api/user/profile/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], "apitest")

    def test_profile_update(self):
        r = self.client.post(
            "/api/user/profile/",
            data=json.dumps({"homepage": "https://example.org"}),
            content_type="application/json",
            **self.jwt,
        )
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.homepage, "https://example.org")

    def test_upload_avatar_non_image(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile("a.txt", b"notimage", content_type="text/plain")
        r = self.client.post(
            "/api/user/profile/avatar/", {"file": f}, **self.jwt
        )
        self.assertEqual(r.status_code, 400)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_upload_avatar_ok(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile(
            "a.png",
            b"\x89PNG\r\n\x1a\n" + b"x" * 100,
            content_type="image/png",
        )
        r = self.client.post(
            "/api/user/profile/avatar/", {"file": f}, **self.jwt
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("avatar_url", r.json())

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_upload_avatar_missing_file_no_error(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        User.objects.filter(pk=self.user.pk).update(avatar="ghost.png")
        self.user.refresh_from_db()
        f = SimpleUploadedFile(
            "a.png",
            b"\x89PNG\r\n\x1a\n" + b"x" * 50,
            content_type="image/png",
        )
        r = self.client.post(
            "/api/user/profile/avatar/", {"file": f}, **self.jwt
        )
        self.assertEqual(r.status_code, 200)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_upload_avatar_remove_exception(self):
        from django.core.files.base import ContentFile
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.user.avatar.save("old.png", ContentFile(b"\x89PNG"), save=True)
        f = SimpleUploadedFile(
            "new.png",
            b"\x89PNG\r\n\x1a\n" + b"x" * 50,
            content_type="image/png",
        )
        with patch("users.api.os.remove", side_effect=OSError("denied")):
            r = self.client.post(
                "/api/user/profile/avatar/", {"file": f}, **self.jwt
            )
        self.assertEqual(r.status_code, 200)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_upload_avatar_too_large(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile(
            "big.png", b"x" * (6 * 1024 * 1024), content_type="image/png"
        )
        r = self.client.post(
            "/api/user/profile/avatar/", {"file": f}, **self.jwt
        )
        self.assertEqual(r.status_code, 400)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_upload_avatar_replaces_existing(self):
        from django.core.files.base import ContentFile
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.user.avatar.save("old.png", ContentFile(b"\x89PNG"), save=True)
        f = SimpleUploadedFile(
            "new.png",
            b"\x89PNG\r\n\x1a\n" + b"x" * 50,
            content_type="image/png",
        )
        r = self.client.post(
            "/api/user/profile/avatar/", {"file": f}, **self.jwt
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("avatar_url", r.json())

    def test_profile_models(self):
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])
