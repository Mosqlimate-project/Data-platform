from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from users.auth import (
    JWTAuth,
    AdminJWTAuth,
    OptionalJWTAuth,
    UidKeyAuth,
    OptionalUidKeyAuth,
    SdkKeyAuth,
    ChartAuth,
    InvalidUIDKey,
    ChartAuthFailed,
)
from users.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from users import adapters
from users.adapters import GoogleAdapter, GithubAdapter, GitlabAdapter
from users.models import OAuthAccount

User = get_user_model()


class UsersJwtTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jwttest", email="jwt@test.com", password="pass"
        )

    def test_decode_invalid_token_returns_none(self):
        self.assertIsNone(decode_token("garbage.token.here"))

    def test_decode_expired_token_returns_none(self):
        tok = create_access_token(
            {"sub": str(self.user.pk)}, expire_minutes=-1
        )
        self.assertIsNone(decode_token(tok))

    def test_create_access_token_roundtrip(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        payload = decode_token(tok)
        self.assertEqual(payload["sub"], str(self.user.pk))

    def test_create_refresh_has_type(self):
        tok = create_refresh_token({"sub": str(self.user.pk)})
        self.assertEqual(decode_token(tok)["type"], "refresh")


class _Req:
    def __init__(
        self, headers=None, cookies=None, meta=None, user=None, session=None
    ):
        self.headers = headers or {}
        self.COOKIES = cookies or {}
        self.META = meta or {}
        self.user = user
        self.session = session or type("S", (), {})()
        self.session.session_key = None


class UsersAuthTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="authtest",
            email="auth@test.com",
            password="pass",
            is_active=True,
        )
        self.user.uuid = self.user.uuid
        self.user.save()

    def test_jwt_auth_no_token_none(self):
        auth = JWTAuth()
        self.assertIsNone(auth.authenticate(_Req(), None))

    def test_jwt_auth_missing_sub_none(self):
        tok = create_access_token({"foo": "bar"})
        self.assertIsNone(auth_authenticate(tok, self.user))

    def test_jwt_auth_inactive_user_none(self):
        self.user.is_active = False
        self.user.save()
        tok = create_access_token({"sub": str(self.user.pk)})
        self.assertIsNone(auth_authenticate(tok, self.user))

    def test_jwt_auth_user_not_found_none(self):
        tok = create_access_token({"sub": "99999"})
        self.assertIsNone(auth_authenticate(tok, self.user))

    def test_jwt_auth_refresh_type_none(self):
        tok = create_refresh_token({"sub": str(self.user.pk)})
        self.assertIsNone(auth_authenticate(tok, self.user))

    def test_jwt_auth_success(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        self.assertEqual(auth_authenticate(tok, self.user), self.user)

    def test_jwt_call_bearer_header(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        req = _Req(headers={"Authorization": f"Bearer {tok}"})
        user = JWTAuth()(req)
        self.assertEqual(user, self.user)

    def test_jwt_call_from_cookie(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        req = _Req(cookies={"access_token": tok})
        user = JWTAuth()(req)
        self.assertEqual(user, self.user)

    def test_admin_jwt_non_staff_raises(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        with self.assertRaises(Exception):
            AdminJWTAuth().authenticate(_Req(), tok)

    def test_admin_jwt_staff_ok(self):
        admin = User.objects.create_superuser(
            username="staff1", email="s@test.com", password="p"
        )
        tok = create_access_token({"sub": str(admin.pk)})
        self.assertEqual(AdminJWTAuth().authenticate(_Req(), tok), admin)

    def test_optional_jwt_anonymous(self):
        self.assertIsNone(OptionalJWTAuth().authenticate(_Req(), None))

    def test_optional_jwt_call_returns_anonymous(self):
        tok = create_access_token({"sub": "99999"})
        req = _Req(headers={"Authorization": f"Bearer {tok}"})
        from django.contrib.auth.models import AnonymousUser

        self.assertIsInstance(OptionalJWTAuth()(req), AnonymousUser)

    def test_optional_jwt_call_no_auth_anonymous(self):
        from django.contrib.auth.models import AnonymousUser

        self.assertIsInstance(OptionalJWTAuth()(_Req()), AnonymousUser)

    def test_optional_jwt_valid_user(self):
        tok = create_access_token({"sub": str(self.user.pk)})
        req = _Req(headers={"Authorization": f"Bearer {tok}"})
        self.assertEqual(OptionalJWTAuth()(req), self.user)

    def test_uid_key_auth_authenticated_session(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = True
        req.user.is_active = True
        req.user.api_key.return_value = self.user.api_key()
        session = type("S", (), {})()
        session.session_key = "sesskey1"
        req.session = session
        UidKeyAuth().authenticate(req, None)
        self.assertEqual(cache.get("sesskey1"), self.user.api_key())

    def test_uid_key_auth_authenticated_saves_session(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = True
        req.user.is_active = True
        req.user.api_key.return_value = self.user.api_key()

        class Session:
            session_key = None

            def save(self):
                self.session_key = "newkey"

        req.session = Session()
        UidKeyAuth().authenticate(req, None)
        self.assertEqual(req.session.session_key, "newkey")
        self.assertEqual(cache.get("newkey"), self.user.api_key())

    def test_uid_key_auth_anonymous_session_fallback(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False

        class Session:
            session_key = None

            def save(self):
                self.session_key = "newsess"

        req.session = Session()
        cache.set("newsess", self.user.api_key())
        with patch("users.auth.cache.get", return_value=self.user.api_key()):
            UidKeyAuth().authenticate(req, None)
            self.assertEqual(req.session.session_key, "newsess")

    def test_uid_key_auth_valid(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        user = UidKeyAuth().authenticate(req, self.user.api_key())
        self.assertEqual(user, self.user)

    def test_uid_key_auth_invalid(self):
        import uuid as _uuid

        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        with self.assertRaises(InvalidUIDKey):
            UidKeyAuth().authenticate(req, f"nobody:{_uuid.uuid4()}")

    def test_uid_key_auth_inactive(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        self.user.is_active = False
        self.user.save()
        with self.assertRaises(InvalidUIDKey):
            UidKeyAuth().authenticate(req, self.user.api_key())

    def test_uid_key_auth_expired(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        self.user.expires_at = timezone.now() - timedelta(days=1)
        self.user.save()
        with self.assertRaises(InvalidUIDKey):
            UidKeyAuth().authenticate(req, self.user.api_key())

    def test_optional_uid_key_anonymous(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        from django.contrib.auth.models import AnonymousUser

        with patch.object(
            UidKeyAuth, "authenticate", side_effect=InvalidUIDKey
        ):
            self.assertIsInstance(OptionalUidKeyAuth()(req), AnonymousUser)

    def test_optional_uid_key_none_anonymous(self):
        req = _Req(user=MagicMock())
        req.user.is_authenticated = False
        from django.contrib.auth.models import AnonymousUser

        with patch.object(UidKeyAuth, "authenticate", return_value=None):
            self.assertIsInstance(OptionalUidKeyAuth()(req), AnonymousUser)

    def test_sdk_key_auth_missing(self):
        self.assertIsNone(SdkKeyAuth().authenticate(_Req(), None))

    def test_sdk_key_auth_not_found(self):
        import uuid as _uuid

        self.assertIsNone(
            SdkKeyAuth().authenticate(_Req(), str(_uuid.uuid4()))
        )

    def test_sdk_key_auth_inactive(self):
        key = self.user.rotate_sdk_key()
        self.user.is_active = False
        self.user.save()
        self.assertIsNone(SdkKeyAuth().authenticate(_Req(), key))

    def test_sdk_key_auth_expired(self):
        key = self.user.rotate_sdk_key()
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=20)
        self.user.save(update_fields=["sdk_key_created_at"])
        self.assertIsNone(SdkKeyAuth().authenticate(_Req(), key))

    def test_sdk_key_auth_ok(self):
        key = self.user.rotate_sdk_key()
        self.assertEqual(SdkKeyAuth().authenticate(_Req(), key), self.user)

    def test_chart_auth_staff_bypass(self):
        admin = MagicMock()
        admin.is_authenticated = True
        admin.is_staff = True
        admin.is_superuser = False
        req = _Req(user=admin)
        self.assertEqual(ChartAuth()(req), admin)

    def test_chart_auth_uid_key(self):
        req = _Req(headers={"X-UID-Key": self.user.api_key()})
        req.user = MagicMock()
        req.user.is_authenticated = False
        self.assertEqual(ChartAuth()(req), self.user)

    def test_chart_auth_uid_key_inactive(self):

        self.user.is_active = False
        self.user.save()
        req = _Req(headers={"X-UID-Key": self.user.api_key()})
        req.user = MagicMock()
        req.user.is_authenticated = False
        with self.assertRaises(ChartAuthFailed):
            ChartAuth()(req)

    def test_chart_auth_uid_key_expired(self):
        self.user.expires_at = timezone.now() - timedelta(days=1)
        self.user.save()
        req = _Req(headers={"X-UID-Key": self.user.api_key()})
        req.user = MagicMock()
        req.user.is_authenticated = False
        with self.assertRaises(ChartAuthFailed):
            ChartAuth()(req)

    def test_chart_auth_fails(self):
        req = _Req()
        req.user = MagicMock()
        req.user.is_authenticated = False
        with self.assertRaises(ChartAuthFailed):
            ChartAuth()(req)


def auth_authenticate(token, user):
    req = _Req()
    return JWTAuth().authenticate(req, token)


class UsersModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="modeltest", email="model@test.com", password="pass"
        )

    def test_create_user_no_email_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email=None, password="x")

    def test_create_superuser_not_staff_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="sup@test.com", password="p", is_staff=False
            )

    def test_create_superuser_not_superuser_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="sup2@test.com", password="p", is_superuser=False
            )

    def test_set_rate_limit_invalid_unit(self):
        with self.assertRaises(ValueError):
            self.user.set_rate_limit(10, "x")

    def test_set_rate_limit_invalid_value(self):
        with self.assertRaises(ValueError):
            self.user.set_rate_limit(-1, "s")

    def test_set_rate_limit_ok(self):
        self.user.set_rate_limit(10, "m")
        self.user.refresh_from_db()
        self.assertEqual(self.user.rate_limit, "10/m")

    def test_get_avatar_file(self):
        self.user.avatar_url = "https://ex.com/a.png"
        self.user.avatar = None
        self.user.save()
        self.assertEqual(self.user.get_avatar(), "https://ex.com/a.png")

    def test_get_avatar_url_only(self):
        self.user.avatar_url = "https://ex.com/b.png"
        self.user.avatar = ""
        self.user.save()
        self.assertEqual(self.user.get_avatar(), "https://ex.com/b.png")

    def test_oauth_account_str(self):
        acc = OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="p1",
            raw_info={},
        )
        self.assertEqual(str(acc), "github")

    def test_oauth_account_duplicate_raises(self):
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="p1",
            raw_info={},
        )
        with self.assertRaises(Exception):
            OAuthAccount.objects.create(
                user=self.user,
                provider="github",
                provider_id="p1",
                raw_info={},
            )


class UsersAdapterTest(TestCase):
    def test_from_request_unsupported(self):
        with self.assertRaises(ValueError):
            adapters.OAuthAdapter.from_request(MagicMock(), "x", {})

    def test_from_request_success(self):
        a = adapters.OAuthAdapter.from_request(
            MagicMock(), "google", {"id": "1"}
        )
        self.assertIsInstance(a, adapters.GoogleAdapter)

    def test_google_adapter(self):
        data = {
            "id": "g1",
            "email": "g@test.com",
            "given_name": "Given",
            "family_name": "Family",
            "picture": "http://pic",
        }
        a = GoogleAdapter(MagicMock(), data)
        self.assertEqual(a.provider_id, "g1")
        self.assertEqual(a.email, "g@test.com")
        self.assertEqual(a.first_name, "Given")
        self.assertEqual(a.last_name, "Family")
        self.assertEqual(a.avatar_url, "http://pic")
        self.assertEqual(a.username, "")

    def test_google_adapter_no_id(self):
        with self.assertRaises(ValueError):
            GoogleAdapter(MagicMock(), {}).provider_id

    def test_google_adapter_no_given_name(self):
        a = GoogleAdapter(MagicMock(), {"id": "1", "name": "Full Name"})
        self.assertEqual(a.first_name, "Full Name")

    def test_github_adapter(self):
        data = {
            "id": "gh1",
            "email": "gh@test.com",
            "login": "ghuser",
            "name": "First Last",
            "avatar_url": "http://av",
        }
        a = GithubAdapter(MagicMock(), data)
        self.assertEqual(a.provider_id, "gh1")
        self.assertEqual(a.email, "gh@test.com")
        self.assertEqual(a.username, "ghuser")
        self.assertEqual(a.first_name, "First")
        self.assertEqual(a.last_name, "Last")
        self.assertEqual(a.avatar_url, "http://av")

    def test_github_adapter_email_fallback(self):
        a = GithubAdapter(MagicMock(), {"id": "1", "notification_email": "n"})
        self.assertEqual(a.email, "n")

    def test_github_adapter_no_name(self):
        a = GithubAdapter(MagicMock(), {"id": "1", "login": "u"})
        self.assertEqual(a.first_name, "")
        self.assertEqual(a.last_name, "")

    def test_github_adapter_no_id(self):
        with self.assertRaises(ValueError):
            GithubAdapter(MagicMock(), {}).provider_id

    def test_gitlab_adapter(self):
        data = {
            "id": "gl1",
            "email": "gl@test.com",
            "username": "gluser",
            "name": "A B C",
            "avatar_url": "http://a",
        }
        a = GitlabAdapter(MagicMock(), data)
        self.assertEqual(a.provider_id, "gl1")
        self.assertEqual(a.email, "gl@test.com")
        self.assertEqual(a.username, "gluser")
        self.assertEqual(a.first_name, "A")
        self.assertEqual(a.last_name, "B C")
        self.assertEqual(a.avatar_url, "http://a")

    def test_gitlab_adapter_no_name(self):
        a = GitlabAdapter(MagicMock(), {"id": "1"})
        self.assertEqual(a.first_name, "")
        self.assertEqual(a.last_name, "")

    def test_gitlab_adapter_single_name(self):
        a = GitlabAdapter(MagicMock(), {"id": "1", "name": "Only"})
        self.assertEqual(a.first_name, "Only")
        self.assertEqual(a.last_name, "")

    def test_redirect_on_login(self):
        from users.adapters import RedirectOnLogin

        adapter = RedirectOnLogin()
        req = MagicMock()
        u = User.objects.create_user(
            username="redirectu", email="r@test.com", password="p"
        )
        req.user = u

        class Session:
            session_key = None

            def save(self):
                self.session_key = "abc123"

        req.session = Session()
        with patch("users.adapters.settings") as mock_settings:
            mock_settings.FRONTEND_URL = "https://front"
            url = adapter.get_login_redirect_url(req)
        self.assertEqual(url, "https://front")
        self.assertEqual(cache.get("abc123"), u.api_key())

    def test_redirect_on_login_existing_session_no_user(self):
        from users.adapters import RedirectOnLogin

        adapter = RedirectOnLogin()
        req = MagicMock()
        req.user = None
        req.session = type("S", (), {})()
        req.session.session_key = "existing"
        with patch("users.adapters.settings") as mock_settings:
            mock_settings.FRONTEND_URL = "https://front"
            url = adapter.get_login_redirect_url(req)
        self.assertEqual(url, "https://front")
