import os
import time
from dataclasses import dataclass
from typing import Optional

import httpx
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

DEFAULT_TIMEOUT = 30.0
DEFAULT_RETRIES = 3
DEFAULT_RETRY_DELAY = 2.0


@dataclass
class EndpointCheck:
    name: str
    path: str
    params: Optional[dict] = None
    auth: bool = False
    json_key: Optional[str] = None
    json_value: Optional[str] = None
    expected_status: int = 200


CHECKS = (
    EndpointCheck(
        "status", "/api/status/", json_key="status", json_value="ok"
    ),
    EndpointCheck("openapi_schema", "/api/openapi.json"),
    EndpointCheck("api_docs", "/api/docs"),
    EndpointCheck("state_info", "/api/state_info/", params={"geocode": 33}),
    EndpointCheck("city_info", "/api/city_info/", params={"geocode": 5200050}),
    EndpointCheck("session_key", "/api/session_key/"),
    EndpointCheck("csrf", "/api/csrf/"),
    EndpointCheck("mosqlimate_logo", "/api/mosqlimate-logo/"),
    EndpointCheck(
        "infodengue_dengue",
        "/api/datastore/infodengue/",
        params={"disease": "dengue"},
        auth=True,
    ),
    EndpointCheck(
        "infodengue_chikungunya",
        "/api/datastore/infodengue/",
        params={"disease": "chikungunya"},
        auth=True,
    ),
    EndpointCheck(
        "infodengue_zika",
        "/api/datastore/infodengue/",
        params={"disease": "zika"},
        auth=True,
    ),
    EndpointCheck("climate", "/api/datastore/climate/", auth=True),
    EndpointCheck("vegetation", "/api/datastore/vegetation/", auth=True),
    EndpointCheck("datastore_cities", "/api/datastore/cities/", auth=True),
    EndpointCheck(
        "episcanner_states",
        "/api/datastore/episcanner/states/",
        auth=True,
    ),
    EndpointCheck("registry_models", "/api/registry/models/", auth=True),
    EndpointCheck(
        "registry_predictions", "/api/registry/predictions/", auth=True
    ),
    EndpointCheck("vis_categories", "/api/vis/dashboard/categories/"),
    EndpointCheck("maps_states", "/api/maps/states", auth=True),
    EndpointCheck("maps_cities", "/api/maps/cities/RJ", auth=True),
)


class Command(BaseCommand):
    help = (
        "Smoke-tests the deployed Mosqlimate API endpoints. It is meant to "
        "run once per deploy (e.g. from the one-shot smoke-test compose "
        "service) and exits non-zero if any endpoint is unhealthy, which "
        "fails the deployment."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--base-url",
            default=None,
            help=(
                "Base URL of the running backend. Defaults to the "
                "SMOKE_TEST_BASE_URL env var or http://127.0.0.1:BACKEND_PORT."
            ),
        )
        parser.add_argument(
            "--uid-key",
            default=None,
            help=(
                "X-UID-Key (username:uuid) used for authenticated endpoints. "
                "Defaults to the ADMIN_UIDKEY env var. When unset, "
                "authenticated checks are skipped."
            ),
        )
        parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
        parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
        parser.add_argument(
            "--retry-delay", type=float, default=DEFAULT_RETRY_DELAY
        )

    def handle(self, *args, **options):
        base_url = self._resolve_base_url(options["base_url"])
        uid_key = options["uid_key"] or os.environ.get("ADMIN_UIDKEY")
        retries = max(1, options["retries"])

        headers = {}
        if uid_key:
            headers["X-UID-Key"] = uid_key

        self.stdout.write(f"Running API smoke tests against {base_url}")

        passed = 0
        skipped = []
        failures = []

        with httpx.Client(
            timeout=options["timeout"], follow_redirects=True
        ) as client:
            for check in CHECKS:
                if check.auth and not uid_key:
                    skipped.append(check.name)
                    continue

                error = self._run_check(
                    client,
                    base_url,
                    headers,
                    check,
                    retries,
                    options["retry_delay"],
                )

                if error:
                    failures.append(f"{check.name}: {error}")
                    self.stderr.write(
                        self.style.ERROR(f"FAIL {check.name}: {error}")
                    )
                else:
                    passed += 1
                    self.stdout.write(self.style.SUCCESS(f"PASS {check.name}"))

        for name in skipped:
            self.stdout.write(
                self.style.WARNING(f"SKIP {name}: ADMIN_UIDKEY not set")
            )

        self.stdout.write(
            f"Smoke tests: {passed} passed, {len(skipped)} skipped, "
            f"{len(failures)} failed"
        )

        if failures:
            raise CommandError(
                f"{len(failures)} endpoint(s) failed: " + "; ".join(failures)
            )

    def _resolve_base_url(self, base_url):
        if base_url:
            return base_url.rstrip("/")

        env_url = os.environ.get("SMOKE_TEST_BASE_URL")
        if env_url:
            return env_url.rstrip("/")

        return f"http://127.0.0.1:{settings.BACKEND_PORT}"

    def _run_check(
        self, client, base_url, headers, check, retries, retry_delay
    ):
        url = base_url + check.path
        response = None
        last_error = None

        for attempt in range(1, retries + 1):
            try:
                response = client.get(
                    url, headers=headers, params=check.params
                )
                break
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt < retries:
                    time.sleep(retry_delay)

        if response is None:
            return f"connection error: {last_error}"

        if response.status_code != check.expected_status:
            return (
                f"unexpected status {response.status_code} "
                f"(expected {check.expected_status})"
            )

        if check.json_key is not None:
            try:
                body = response.json()
            except ValueError:
                return "response is not valid JSON"

            if body.get(check.json_key) != check.json_value:
                return (
                    f"unexpected {check.json_key!r}: "
                    f"{body.get(check.json_key)!r} "
                    f"(expected {check.json_value!r})"
                )

        return None
