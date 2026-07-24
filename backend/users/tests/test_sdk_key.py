import uuid
from datetime import timedelta

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class SdkKeyModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="sdkuser",
            email="sdk@test.com",
            password="testpass",
        )

    def test_sdk_key_initially_none(self):
        self.assertIsNone(self.user.sdk_key)
        self.assertIsNone(self.user.sdk_key_created_at)

    def test_sdk_key_is_expired_when_none(self):
        self.assertTrue(self.user.sdk_key_is_expired())

    def test_sdk_key_is_expired_when_old(self):
        self.user.sdk_key = uuid.uuid4()
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=["sdk_key", "sdk_key_created_at"])
        self.assertTrue(self.user.sdk_key_is_expired())

    def test_sdk_key_not_expired_when_fresh(self):
        self.user.sdk_key = uuid.uuid4()
        self.user.sdk_key_created_at = timezone.now()
        self.user.save(update_fields=["sdk_key", "sdk_key_created_at"])
        self.assertFalse(self.user.sdk_key_is_expired())

    def test_sdk_key_not_expired_on_day_6(self):
        self.user.sdk_key = uuid.uuid4()
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=6)
        self.user.save(update_fields=["sdk_key", "sdk_key_created_at"])
        self.assertFalse(self.user.sdk_key_is_expired())

    def test_sdk_key_expired_on_day_7(self):
        self.user.sdk_key = uuid.uuid4()
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=7)
        self.user.save(update_fields=["sdk_key", "sdk_key_created_at"])
        self.assertTrue(self.user.sdk_key_is_expired())

    def test_rotate_sdk_key_creates_new_key(self):
        result = self.user.rotate_sdk_key()
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.sdk_key)
        self.assertIsNotNone(self.user.sdk_key_created_at)
        self.assertEqual(result, str(self.user.sdk_key))

    def test_rotate_sdk_key_returns_string(self):
        result = self.user.rotate_sdk_key()
        self.assertIsInstance(result, str)
        uuid.UUID(result)  # should not raise

    def test_rotate_sdk_key_changes_value(self):
        first_key = self.user.rotate_sdk_key()
        second_key = self.user.rotate_sdk_key()
        self.assertNotEqual(first_key, second_key)

    def test_get_or_create_sdk_key_creates_on_first_call(self):
        key = self.user.get_or_create_sdk_key()
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.sdk_key)
        self.assertEqual(key, str(self.user.sdk_key))

    def test_get_or_create_sdk_key_returns_same_when_valid(self):
        key1 = self.user.get_or_create_sdk_key()
        key2 = self.user.get_or_create_sdk_key()
        self.assertEqual(key1, key2)

    def test_get_or_create_sdk_key_rotates_when_expired(self):
        key1 = self.user.get_or_create_sdk_key()
        # Force expiry
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=["sdk_key_created_at"])
        key2 = self.user.get_or_create_sdk_key()
        self.assertNotEqual(key1, key2)

    def test_sdk_key_unique_constraint(self):
        key = uuid.uuid4()
        self.user.sdk_key = key
        self.user.save(update_fields=["sdk_key"])
        user2 = User.objects.create_user(
            username="sdkuser2",
            email="sdk2@test.com",
            password="testpass",
        )
        user2.sdk_key = key
        with self.assertRaises(Exception):
            user2.save(update_fields=["sdk_key"])


class SdkKeyEndpointTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="sdkuser",
            email="sdk@test.com",
            password="testpass",
        )
        # Get JWT token
        from users.jwt import create_access_token

        self.token = create_access_token({"sub": str(self.user.pk)})
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_get_sdk_key_creates_new_key(self):
        r = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("sdk_key", data)
        self.assertIn("expires_at", data)
        self.assertIn("ttl_days", data)
        self.assertEqual(data["ttl_days"], 7)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.sdk_key)

    def test_get_sdk_key_returns_same_when_valid(self):
        r1 = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        r2 = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        self.assertEqual(r1.json()["sdk_key"], r2.json()["sdk_key"])

    def test_get_sdk_key_rotates_when_expired(self):
        r1 = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        # Force expiry
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=["sdk_key_created_at"])
        r2 = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        self.assertNotEqual(r1.json()["sdk_key"], r2.json()["sdk_key"])

    def test_rotate_sdk_key_returns_new_key(self):
        r1 = self.client.get("/api/user/sdk-key/", **self.auth_headers)
        r2 = self.client.post("/api/user/sdk-key/rotate/", **self.auth_headers)
        self.assertEqual(r2.status_code, 201)
        self.assertNotEqual(r1.json()["sdk_key"], r2.json()["sdk_key"])

    def test_rotate_sdk_key_always_returns_fresh(self):
        r1 = self.client.post("/api/user/sdk-key/rotate/", **self.auth_headers)
        r2 = self.client.post("/api/user/sdk-key/rotate/", **self.auth_headers)
        self.assertNotEqual(r1.json()["sdk_key"], r2.json()["sdk_key"])

    def test_get_sdk_key_requires_jwt(self):
        r = self.client.get("/api/user/sdk-key/")
        self.assertEqual(r.status_code, 401)

    def test_rotate_sdk_key_requires_jwt(self):
        r = self.client.post("/api/user/sdk-key/rotate/")
        self.assertEqual(r.status_code, 401)

    def test_get_sdk_key_rejects_expired_jwt(self):
        from datetime import datetime
        from jose import jwt as jose_jwt
        from django.conf import settings

        payload = {
            "sub": str(self.user.pk),
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access",
        }
        expired_token = jose_jwt.encode(
            payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        r = self.client.get(
            "/api/user/sdk-key/",
            HTTP_AUTHORIZATION=f"Bearer {expired_token}",
        )
        self.assertEqual(r.status_code, 401)

    def test_get_sdk_key_rejects_refresh_token(self):
        from users.jwt import create_refresh_token

        refresh_token = create_refresh_token({"sub": str(self.user.pk)})
        r = self.client.get(
            "/api/user/sdk-key/",
            HTTP_AUTHORIZATION=f"Bearer {refresh_token}",
        )
        self.assertEqual(r.status_code, 401)


class ChartAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="chartuser",
            email="chart@test.com",
            password="testpass",
        )
        self.uid_key = self.user.api_key()
        self.sdk_key = self.user.rotate_sdk_key()
        self.chart_url = "/api/vis/charts/contaovos/eggs_density/"
        self.chart_params = {"start": "2024-01-01", "end": "2024-01-31"}

    def test_chart_endpoint_accepts_uid_key(self):
        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_UID_KEY=self.uid_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_chart_endpoint_accepts_sdk_key(self):
        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_chart_endpoint_rejects_invalid_sdk_key(self):
        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY="invalid-key",
        )
        self.assertEqual(r.status_code, 401)

    def test_chart_endpoint_rejects_expired_sdk_key(self):
        self.user.sdk_key_created_at = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=["sdk_key_created_at"])
        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 401)

    def test_chart_endpoint_rejects_invalid_uid_key(self):
        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_UID_KEY="invalid:key",
        )
        self.assertEqual(r.status_code, 401)

    def test_chart_endpoint_rejects_no_auth(self):
        r = self.client.get(self.chart_url, self.chart_params)
        self.assertEqual(r.status_code, 401)

    def test_sdk_key_takes_precedence(self):
        user2 = User.objects.create_user(
            username="chartuser2",
            email="chart2@test.com",
            password="testpass",
        )
        sdk_key2 = user2.rotate_sdk_key()

        r = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=sdk_key2,
        )
        self.assertEqual(r.status_code, 200)
