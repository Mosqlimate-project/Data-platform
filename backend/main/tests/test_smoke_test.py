import os
from io import StringIO
from unittest.mock import MagicMock, patch

import httpx
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from main.management.commands.smoke_test import (
    CHECKS,
    MAX_BODY_SNIPPET,
    Command,
    EndpointCheck,
)


class FakeResponse:
    def __init__(
        self, status_code=200, json_data=None, json_error=None, text=""
    ):
        self.status_code = status_code
        self._json_data = json_data
        self._json_error = json_error
        self.text = text

    def json(self):
        if self._json_error is not None:
            raise self._json_error
        return self._json_data


class FakeClient:
    def __init__(self, *args, **kwargs):
        self.get = MagicMock()

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


class ResolveBaseUrlTest(SimpleTestCase):
    def test_explicit_url_strips_trailing_slash(self):
        self.assertEqual(
            Command()._resolve_base_url("http://example.org/"),
            "http://example.org",
        )

    def test_env_url_strips_trailing_slash(self):
        with patch.dict(
            os.environ, {"SMOKE_TEST_BASE_URL": "http://env.local/"}
        ):
            self.assertEqual(
                Command()._resolve_base_url(None), "http://env.local"
            )

    @override_settings(BACKEND_PORT="8042")
    def test_default_url_uses_backend_port(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                Command()._resolve_base_url(None),
                "http://127.0.0.1:8042",
            )


class RunCheckTest(SimpleTestCase):
    def _run(self, response=None, side_effect=None, retries=2, **kwargs):
        client = MagicMock()
        if side_effect is not None:
            client.get.side_effect = side_effect
        else:
            client.get.return_value = response

        check = EndpointCheck(name="probe", path="/probe/", **kwargs)
        return Command()._run_check(
            client, "http://host", {}, check, retries, 0.0
        )

    def test_success(self):
        self.assertIsNone(self._run(response=FakeResponse(200)))

    def test_unexpected_status(self):
        error = self._run(response=FakeResponse(503))
        self.assertIn("unexpected status 503", error)
        self.assertIn("on GET http://host/probe/", error)

    def test_unexpected_status_includes_body(self):
        error = self._run(
            response=FakeResponse(500, text="  boom\n operator  ")
        )
        self.assertIn("response body: boom operator", error)

    def test_unexpected_status_long_body_truncated(self):
        error = self._run(
            response=FakeResponse(500, text="x" * (MAX_BODY_SNIPPET + 50))
        )
        self.assertIn("... (truncated)", error)

    def test_unexpected_status_empty_body(self):
        error = self._run(response=FakeResponse(500, text=""))
        self.assertNotIn("response body", error)

    def test_invalid_json(self):
        error = self._run(
            response=FakeResponse(
                200, json_error=ValueError("nope"), text="not json"
            ),
            json_key="status",
            json_value="ok",
        )
        self.assertIn("response is not valid JSON", error)
        self.assertIn("not json", error)

    def test_json_mismatch(self):
        error = self._run(
            response=FakeResponse(200, json_data={"status": "down"}),
            json_key="status",
            json_value="ok",
        )
        self.assertIn("unexpected 'status'", error)

    def test_json_match(self):
        self.assertIsNone(
            self._run(
                response=FakeResponse(200, json_data={"status": "ok"}),
                json_key="status",
                json_value="ok",
            )
        )

    def test_retries_then_fails(self):
        error = self._run(side_effect=httpx.ConnectError("refused"), retries=2)
        self.assertIn("connection error", error)

    def test_retries_then_succeeds(self):
        self.assertIsNone(
            self._run(
                side_effect=[
                    httpx.ConnectError("refused"),
                    FakeResponse(200),
                ],
                retries=2,
            )
        )


class SmokeTestCommandTest(SimpleTestCase):
    @patch.dict(os.environ, {"ADMIN_UIDKEY": "admin:key"})
    @patch(
        "main.management.commands.smoke_test.httpx.Client",
        FakeClient,
    )
    def test_all_checks_pass(self):
        out = StringIO()
        with patch.object(
            Command, "_run_check", return_value=None
        ) as run_check:
            call_command(
                "smoke_test",
                "--base-url",
                "http://backend",
                stdout=out,
            )

        self.assertEqual(run_check.call_count, len(CHECKS))
        self.assertIn("0 failed", out.getvalue())

    @patch.dict(os.environ, {"ADMIN_UIDKEY": "admin:key"})
    @patch(
        "main.management.commands.smoke_test.httpx.Client",
        FakeClient,
    )
    def test_failures_raise_command_error(self):
        out = StringIO()
        err = StringIO()
        with patch.object(Command, "_run_check", return_value="boom"):
            with self.assertRaises(CommandError):
                call_command(
                    "smoke_test",
                    "--base-url",
                    "http://backend",
                    stdout=out,
                    stderr=err,
                )

        self.assertIn("FAIL status: boom", err.getvalue())

    @patch.dict(os.environ, {"ADMIN_UIDKEY": ""})
    @patch(
        "main.management.commands.smoke_test.httpx.Client",
        FakeClient,
    )
    def test_skips_authenticated_checks_without_key(self):
        out = StringIO()
        with patch.object(
            Command, "_run_check", return_value=None
        ) as run_check:
            call_command(
                "smoke_test",
                "--base-url",
                "http://backend",
                stdout=out,
            )

        authed = sum(1 for check in CHECKS if check.auth)
        self.assertEqual(run_check.call_count, len(CHECKS) - authed)
        self.assertIn(f"{authed} skipped", out.getvalue())
        self.assertIn("SKIP", out.getvalue())
