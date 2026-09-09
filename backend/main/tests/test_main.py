import json
import os
import tempfile
from datetime import datetime
from unittest.mock import MagicMock, patch
from pathlib import Path

from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from users.jwt import create_access_token
from main.api import SafeJSONRenderer, api
from main.models import APILog
from main.throttle import APIThrottle
from main import tasks as main_tasks

User = get_user_model()


class MainAPIEndpointsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="mainuser",
            email="main@test.com",
            password="testpass",
            is_active=True,
        )
        self.jwt_token = create_access_token({"sub": str(self.user.pk)})
        self.jwt_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.jwt_token}"}
        self.uid_headers = {"HTTP_X_UID_KEY": self.user.api_key()}

    def test_status(self):
        resp = self.client.get("/api/status/")
        self.assertEqual(resp.status_code, 200)

    def test_session_key(self):
        resp = self.client.get("/api/session_key/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("session_key", resp.json())

    def test_session_key_existing_session(self):
        s = self.client.session
        s["probe"] = "value"
        s.save()
        resp = self.client.get("/api/session_key/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("session_key", resp.json())

    def test_csrf(self):
        resp = self.client.get("/api/csrf/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("csrf_token", resp.json())

    def test_state_info(self):
        resp = self.client.get("/api/state_info/", {"geocode": 33})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["uf"], "RJ")

    def test_state_info_unknown(self):
        resp = self.client.get("/api/state_info/", {"geocode": 999})
        self.assertEqual(resp.status_code, 404)

    def test_city_info(self):
        resp = self.client.get("/api/city_info/", {"geocode": 5200050})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["uf"], "GO")
        self.assertEqual(data["uf_nome"], "Goiás")

    def test_city_info_unknown(self):
        resp = self.client.get("/api/city_info/", {"geocode": 9999999})
        self.assertEqual(resp.status_code, 404)

    def test_mosqlimate_logo(self):
        resp = self.client.get("/api/mosqlimate-logo/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "image/jpeg")

    def test_invalid_uid_key_handler(self):
        resp = self.client.get(
            "/api/datastore/climate/",
            {"geocode": 3304557},
            HTTP_X_UID_KEY="invalid",
        )
        self.assertEqual(resp.status_code, 401)

    def test_chart_auth_failed_handler(self):
        resp = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            HTTP_X_SDK_KEY="invalid",
        )
        self.assertEqual(resp.status_code, 401)


class MainModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="mainmodel",
            email="mm@test.com",
            password="testpass",
        )

    def _request(self, path="/api/x/", method="GET", body=b"", **extra):
        r = MagicMock()
        r.path = path
        r.method = method
        r.GET = MagicMock()
        r.GET.dict.return_value = {"a": "1"}
        r.POST = MagicMock()
        r.POST.dict.return_value = {"b": "2"}
        r.body = body
        r.auth = self.user
        r.__dict__.update(extra)
        return r

    def test_str(self):
        log = APILog.objects.create(
            user=self.user,
            method="GET",
            endpoint="/api/x/",
            params={},
        )
        self.assertIn("GET", str(log))

    def test_from_request_non_api_path(self):
        self.assertIsNone(APILog.from_request(self._request(path="/other/")))

    def test_from_request_get(self):
        log = APILog.from_request(self._request(method="GET"))
        self.assertIsNotNone(log)
        self.assertEqual(log.params, {"a": "1"})

    def test_from_request_post(self):
        log = APILog.from_request(self._request(method="POST"))
        self.assertEqual(log.params, {"b": "2"})

    def test_from_request_put(self):
        log = APILog.from_request(self._request(method="PUT"))
        self.assertEqual(log.params, {})

    def test_from_request_delete(self):
        log = APILog.from_request(self._request(method="DELETE"))
        self.assertEqual(log.params, {})

    def test_from_request_other_method(self):
        with self.assertRaises(NotImplementedError):
            APILog.from_request(self._request(method="PATCH"))

    def test_from_request_with_user_param(self):
        log = APILog.from_request(self._request(), user=self.user)
        self.assertEqual(log.user, self.user)


class MainThrottleTest(TestCase):
    def setUp(self):
        cache.clear()

    def _req(self, user=None, auth=None):
        r = MagicMock()
        r.auth = auth
        r.user = user
        r.pk = 1
        return r

    def test_anonymous_allowed(self):
        self.assertTrue(APIThrottle().allow_request(self._req()))

    def test_staff_allowed(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = True
        self.assertTrue(APIThrottle().allow_request(self._req(user=user)))

    def test_rate_limit_none_allowed(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = None
        self.assertTrue(APIThrottle().allow_request(self._req(user=user)))

    def test_invalid_rate_limit_format_allowed(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "abc"
        self.assertTrue(APIThrottle().allow_request(self._req(user=user)))

    def test_first_request_allowed(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "2/s"
        user.pk = 999
        self.assertTrue(APIThrottle().allow_request(self._req(user=user)))

    def test_limit_reached_denied(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "2/s"
        user.pk = 1000
        cache.set(f"rate_limit:{user.pk}", 5, timeout=60)
        self.assertFalse(APIThrottle().allow_request(self._req(user=user)))

    def test_incr_value_error_resets(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "2/s"
        user.pk = 1001
        cache.set(f"rate_limit:{user.pk}", 1, timeout=60)
        with patch("main.throttle.cache.incr", side_effect=ValueError):
            self.assertTrue(APIThrottle().allow_request(self._req(user=user)))
        self.assertEqual(cache.get(f"rate_limit:{user.pk}"), 1)

    def test_under_limit_incrs_and_allows(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "5/s"
        user.pk = 1002
        cache.set(f"rate_limit:{user.pk}", 1, timeout=60)
        self.assertTrue(APIThrottle().allow_request(self._req(user=user)))
        self.assertEqual(cache.get(f"rate_limit:{user.pk}"), 2)


class APILogAdminTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admintest",
            email="admin@test.com",
            password="adminpass",
        )
        self.user = User.objects.create_user(
            username="normaluser",
            email="n@test.com",
            password="pass",
        )
        self.token = create_access_token({"sub": str(self.admin.pk)})
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.log1 = APILog.objects.create(
            user=self.user,
            method="GET",
            endpoint="/api/datastore/x/",
            params={},
        )
        self.log2 = APILog.objects.create(
            user=self.user,
            method="GET",
            endpoint="/api/registry/y/",
            params={},
        )

    def test_list_all_users(self):
        resp = self.client.get("/api/log/users/", **self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("normaluser", [u["username"] for u in resp.json()])

    def test_usage_total(self):
        resp = self.client.get(
            "/api/log/usage/",
            {"start": "2020-01-01", "group_by": ""},
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_requests"], 2)

    def test_usage_total_with_app(self):
        resp = self.client.get(
            "/api/log/usage/",
            {"start": "2020-01-01", "group_by": "", "app": "datastore"},
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["application_scope_count"], 1)

    def test_usage_by_endpoint(self):
        resp = self.client.get(
            "/api/log/usage/",
            {"start": "2020-01-01", "group_by": "endpoint"},
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("/api/datastore/x/", resp.json())

    def test_usage_by_endpoint_with_app(self):
        resp = self.client.get(
            "/api/log/usage/",
            {
                "start": "2020-01-01",
                "group_by": "endpoint",
                "app": "datastore",
            },
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("x/", resp.json())

    def test_usage_by_day(self):
        resp = self.client.get(
            "/api/log/usage/",
            {"start": "2020-01-01", "group_by": "day"},
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_usage_by_user(self):
        resp = self.client.get(
            "/api/log/usage/",
            {"start": "2020-01-01", "group_by": "user"},
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()[0]["username"], "normaluser")

    def test_usage_with_endpoint_filter(self):
        resp = self.client.get(
            "/api/log/usage/",
            {
                "start": "2020-01-01",
                "group_by": "endpoint",
                "endpoint": "/api/datastore/x/",
            },
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["/api/datastore/x/"], 1)

    def test_update_user_success(self):
        resp = self.client.patch(
            f"/api/log/users/{self.user.id}/",
            data=json.dumps({"is_active": False, "rate_limit": "5/s"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_update_user_not_found(self):
        resp = self.client.patch(
            "/api/log/users/99999/",
            data=json.dumps({"is_active": True}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 404)

    def test_update_staff_forbidden(self):
        resp = self.client.patch(
            f"/api/log/users/{self.admin.id}/",
            data=json.dumps({"is_active": False}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 403)

    def test_history(self):
        resp = self.client.get(
            "/api/log/history/", {"limit": 50}, **self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_history_invalid_limit_defaults(self):
        resp = self.client.get(
            "/api/log/history/", {"limit": 42}, **self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_update_user_rate_limit_only(self):
        resp = self.client.patch(
            f"/api/log/users/{self.user.id}/",
            data=json.dumps({"rate_limit": "9/s"}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.rate_limit, "9/s")

    def test_update_user_active_only(self):
        resp = self.client.patch(
            f"/api/log/users/{self.user.id}/",
            data=json.dumps({"is_active": False}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_update_user_no_changes(self):
        resp = self.client.patch(
            f"/api/log/users/{self.user.id}/",
            data=json.dumps({}),
            content_type="application/json",
            **self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["username"], "normaluser")

    def test_history_condenses_consecutive(self):
        APILog.objects.create(
            user=self.user,
            method="GET",
            endpoint="/api/datastore/x/?a=1",
            params={},
        )
        APILog.objects.create(
            user=self.user,
            method="GET",
            endpoint="/api/datastore/x/?a=2",
            params={},
        )
        resp = self.client.get(
            "/api/log/history/", {"limit": 100}, **self.headers
        )
        self.assertEqual(resp.status_code, 200)
        entries = resp.json()
        datastore = [
            e for e in entries if e["endpoint"] == "/api/datastore/x/"
        ]
        self.assertEqual(datastore[0]["count"], 2)


class MainUrlsTest(TestCase):
    @override_settings(DOCS_URL="https://example.org/docs")
    def test_docs_redirect(self):
        resp = self.client.get("/docs/")
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://example.org/docs/")

    @override_settings(DOCS_URL="https://example.org/docs/")
    def test_docs_redirect_trailing_slash(self):
        resp = self.client.get("/docs/")
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], "https://example.org/docs/")


class MainRendererTest(TestCase):
    def _render(self, data):
        return SafeJSONRenderer().render(None, data, response_status=200)

    def test_clean_nan(self):
        out = self._render({"a": float("nan")})
        self.assertIn("null", out)

    def test_clean_nested_dict_list(self):
        out = self._render({"a": {"b": [1, 2]}})
        self.assertEqual(json.loads(out), {"a": {"b": [1, 2]}})

    def test_clean_model_dump(self):
        obj = type("O", (), {"model_dump": lambda self: {"x": 1}})()
        out = self._render([obj])
        self.assertEqual(json.loads(out), [{"x": 1}])

    def test_clean_plain_object(self):
        out = self._render(3)
        self.assertEqual(out, "3")

    def test_get_openapi_schema(self):
        schema = api.get_openapi_schema()
        self.assertNotIn("BadRequestSchema", schema)


class MainTasksTest(TestCase):
    def test_backup_success(self):
        with patch("main.tasks._pg_dump", return_value=True) as dump, patch(
            "main.tasks._cleanup_old_backups"
        ), patch("main.tasks.settings") as mock_settings:
            mock_settings.BACKUP_DIR = Path(tempfile.mkdtemp())
            mock_settings.DATABASES = {
                "default": {
                    "NAME": "d",
                    "USER": "u",
                    "PASSWORD": "p",
                    "HOST": "h",
                    "PORT": "5432",
                }
            }
            result = main_tasks.backup_databases()
            self.assertTrue(result["success"])
            dump.assert_called_once()

    def test_backup_failure(self):
        with patch("main.tasks._pg_dump", return_value=False), patch(
            "main.tasks._cleanup_old_backups"
        ), patch("main.tasks.settings") as mock_settings:
            mock_settings.BACKUP_DIR = Path(tempfile.mkdtemp())
            mock_settings.DATABASES = {"default": {}}
            result = main_tasks.backup_databases()
            self.assertFalse(result["success"])
            self.assertIsNone(result["file"])

    @patch("main.tasks.subprocess.run")
    def test_pg_dump_success(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout=b"DATA")
        ok = main_tasks._pg_dump(
            {
                "NAME": "d",
                "USER": "u",
                "PASSWORD": "p",
                "HOST": "h",
                "PORT": "5432",
            },
            Path(tempfile.mkdtemp()) / "out.sql.gz",
        )
        self.assertTrue(ok)

    @patch("main.tasks.subprocess.run")
    def test_pg_dump_failure(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stderr=b"boom")
        ok = main_tasks._pg_dump(
            {
                "NAME": "d",
                "USER": "u",
                "PASSWORD": "p",
                "HOST": "h",
                "PORT": "5432",
            },
            Path(tempfile.mkdtemp()) / "out.sql.gz",
        )
        self.assertFalse(ok)

    @patch("main.tasks.subprocess.run", side_effect=Exception("no pg_dump"))
    def test_pg_dump_exception(self, mock_run):
        ok = main_tasks._pg_dump(
            {
                "NAME": "d",
                "USER": "u",
                "PASSWORD": "p",
                "HOST": "h",
                "PORT": "5432",
            },
            Path(tempfile.mkdtemp()) / "out.sql.gz",
        )
        self.assertFalse(ok)

    def test_cleanup_old_backups(self):
        d = tempfile.mkdtemp()
        old = Path(d) / "old.sql.gz"
        new = Path(d) / "new.sql.gz"
        old.write_bytes(b"x")
        new.write_bytes(b"x")
        now = datetime.now(timezone.get_current_timezone())
        os.utime(old, (now.timestamp() - 4000000, now.timestamp() - 4000000))
        os.utime(new, (now.timestamp(), now.timestamp()))
        with patch(
            "main.tasks.timezone.now",
            return_value=now,
        ):
            main_tasks._cleanup_old_backups(Path(d), 30)
        self.assertFalse(old.exists())
        self.assertTrue(new.exists())

    @patch("main.tasks.logger")
    def test_cleanup_old_backups_exception(self, mock_logger):
        with patch(
            "main.tasks.timezone.now",
            return_value=datetime.now(timezone.get_current_timezone()),
        ), patch("main.tasks.Path") as MockPath:
            fake_file = MagicMock()
            fake_file.name = "bad.sql.gz"
            fake_file.stat.side_effect = OSError("stat failed")
            MockPath.return_value.glob.return_value = [fake_file]
            main_tasks._cleanup_old_backups(MockPath.return_value, 30)
        mock_logger.exception.assert_called()
