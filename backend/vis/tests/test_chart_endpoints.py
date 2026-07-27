from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone

from vis.charts.schema import (
    InfodengueChartIn,
    ClimateChartIn,
    ContaOvosChartIn,
    ContaOvosPositivityIn,
    ContaOvosMapIn,
    VALID_UFS,
)

User = get_user_model()


class InfodengueChartInTest(TestCase):
    def test_valid_dengue(self):
        payload = InfodengueChartIn(
            disease="dengue",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "dengue")

    def test_valid_deng(self):
        payload = InfodengueChartIn(
            disease="deng",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "deng")

    def test_valid_chik(self):
        payload = InfodengueChartIn(
            disease="chik",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "chik")

    def test_valid_chikungunya(self):
        payload = InfodengueChartIn(
            disease="chikungunya",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "chikungunya")

    def test_valid_zika(self):
        payload = InfodengueChartIn(
            disease="zika",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "zika")

    def test_invalid_disease(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="malaria",
                geocode=3304557,
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
            )

    def test_geocode_must_be_7_digits(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="dengue",
                geocode=123,
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
            )

    def test_geocode_exactly_7_digits(self):
        payload = InfodengueChartIn(
            disease="dengue",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.geocode, 3304557)

    def test_geocode_8_digits_rejected(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="dengue",
                geocode=33045570,
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
            )

    def test_date_range_max_365_days(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="dengue",
                geocode=3304557,
                start=date(2025, 1, 1),
                end=date(2026, 1, 2),
            )

    def test_date_range_365_days_ok(self):
        payload = InfodengueChartIn(
            disease="dengue",
            geocode=3304557,
            start=date(2025, 1, 1),
            end=date(2025, 12, 31),
        )
        self.assertEqual(payload.end - payload.start, timedelta(days=364))

    def test_end_before_start_rejected(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="dengue",
                geocode=3304557,
                start=date(2026, 6, 1),
                end=date(2026, 1, 1),
            )

    def test_same_date_ok(self):
        payload = InfodengueChartIn(
            disease="dengue",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 1, 1),
        )
        self.assertEqual(payload.start, payload.end)

    def test_disease_is_lowercased(self):
        payload = InfodengueChartIn(
            disease="Dengue",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "dengue")

    def test_disease_case_insensitive(self):
        payload = InfodengueChartIn(
            disease="ZIKA",
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.disease, "zika")


class ClimateChartInTest(TestCase):
    def test_valid(self):
        payload = ClimateChartIn(
            geocode=3304557,
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.geocode, 3304557)

    def test_geocode_must_be_7_digits(self):
        with self.assertRaises(Exception):
            ClimateChartIn(
                geocode=123,
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
            )

    def test_date_range_max(self):
        with self.assertRaises(Exception):
            ClimateChartIn(
                geocode=3304557,
                start=date(2024, 1, 1),
                end=date(2025, 2, 1),
            )

    def test_end_before_start(self):
        with self.assertRaises(Exception):
            ClimateChartIn(
                geocode=3304557,
                start=date(2026, 6, 1),
                end=date(2026, 1, 1),
            )


class ContaOvosChartInTest(TestCase):
    def test_valid_with_uf(self):
        payload = ContaOvosChartIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
            uf="SP",
        )
        self.assertEqual(payload.uf, "SP")

    def test_valid_with_geocode(self):
        payload = ContaOvosChartIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
            geocode=3550308,
        )
        self.assertEqual(payload.geocode, 3550308)

    def test_valid_no_optional(self):
        payload = ContaOvosChartIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertIsNone(payload.uf)
        self.assertIsNone(payload.geocode)

    def test_invalid_uf(self):
        with self.assertRaises(Exception):
            ContaOvosChartIn(
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
                uf="XX",
            )

    def test_uf_uppercased(self):
        payload = ContaOvosChartIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
            uf="rj",
        )
        self.assertEqual(payload.uf, "RJ")

    def test_geocode_must_be_7_digits(self):
        with self.assertRaises(Exception):
            ContaOvosChartIn(
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
                geocode=123,
            )

    def test_date_range_max(self):
        with self.assertRaises(Exception):
            ContaOvosChartIn(
                start=date(2024, 1, 1),
                end=date(2025, 2, 1),
            )

    def test_end_before_start(self):
        with self.assertRaises(Exception):
            ContaOvosChartIn(
                start=date(2026, 6, 1),
                end=date(2026, 1, 1),
            )

    def test_all_valid_ufs_accepted(self):
        for uf in VALID_UFS:
            payload = ContaOvosChartIn(
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
                uf=uf,
            )
            self.assertEqual(payload.uf, uf)


class ContaOvosPositivityInTest(TestCase):
    def test_valid(self):
        payload = ContaOvosPositivityIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertIsNone(payload.uf)

    def test_valid_with_uf(self):
        payload = ContaOvosPositivityIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
            uf="MG",
        )
        self.assertEqual(payload.uf, "MG")

    def test_invalid_uf(self):
        with self.assertRaises(Exception):
            ContaOvosPositivityIn(
                start=date(2026, 1, 1),
                end=date(2026, 3, 1),
                uf="ZZ",
            )


class ContaOvosMapInTest(TestCase):
    def test_valid(self):
        payload = ContaOvosMapIn(
            start=date(2026, 1, 1),
            end=date(2026, 3, 1),
        )
        self.assertEqual(payload.start, date(2026, 1, 1))

    def test_date_range_max(self):
        with self.assertRaises(Exception):
            ContaOvosMapIn(
                start=date(2024, 1, 1),
                end=date(2025, 2, 1),
            )

    def test_end_before_start(self):
        with self.assertRaises(Exception):
            ContaOvosMapIn(
                start=date(2026, 6, 1),
                end=date(2026, 1, 1),
            )


class ClimateChartEndpointTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="climateuser",
            email="climate@test.com",
            password="testpass",
        )
        self.sdk_key = self.user.rotate_sdk_key()
        self.uid_key = self.user.api_key()

    @patch("vis.charts.climate.CopernicusBrasil")
    def test_temperature_requires_auth(self, mock_model):
        r = self.client.get(
            "/api/vis/charts/climate/temperature/",
            {"geocode": 3304557, "start": "2026-01-01", "end": "2026-01-01"},
        )
        self.assertEqual(r.status_code, 401)

    @patch("vis.charts.climate.CopernicusBrasil")
    def test_temperature_accepts_sdk_key(self, mock_model):
        mock_model.objects.using.return_value.filter.return_value.order_by.return_value.values.return_value = (
            []
        )
        r = self.client.get(
            "/api/vis/charts/climate/temperature/",
            {"geocode": 3304557, "start": "2026-01-01", "end": "2026-01-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    @patch("vis.charts.climate.CopernicusBrasil")
    def test_temperature_accepts_uid_key(self, mock_model):
        mock_model.objects.using.return_value.filter.return_value.order_by.return_value.values.return_value = (
            []
        )
        r = self.client.get(
            "/api/vis/charts/climate/temperature/",
            {"geocode": 3304557, "start": "2026-01-01", "end": "2026-01-01"},
            HTTP_X_UID_KEY=self.uid_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_temperature_rejects_invalid_geocode(self):
        r = self.client.get(
            "/api/vis/charts/climate/temperature/",
            {"geocode": 123, "start": "2026-01-01", "end": "2026-01-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])

    def test_temperature_rejects_date_range_too_large(self):
        r = self.client.get(
            "/api/vis/charts/climate/temperature/",
            {"geocode": 3304557, "start": "2024-01-01", "end": "2025-02-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])

    @patch("vis.charts.climate.CopernicusBrasil")
    def test_accumulated_waterfall_accepts_sdk_key(self, mock_model):
        mock_model.objects.using.return_value.filter.return_value.order_by.return_value.values.return_value = (
            []
        )
        r = self.client.get(
            "/api/vis/charts/climate/accumulated-waterfall/",
            {"geocode": 3304557, "start": "2026-01-01", "end": "2026-01-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    @patch("vis.charts.climate.CopernicusBrasil")
    def test_humidity_pressure_accepts_sdk_key(self, mock_model):
        mock_model.objects.using.return_value.filter.return_value.order_by.return_value.values.return_value = (
            []
        )
        r = self.client.get(
            "/api/vis/charts/climate/umid-pressao-med/",
            {"geocode": 3304557, "start": "2026-01-01", "end": "2026-01-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)


class InfodengueChartEndpointTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="infouser",
            email="info@test.com",
            password="testpass",
        )
        self.sdk_key = self.user.rotate_sdk_key()

    def test_rt_requires_auth(self):
        r = self.client.get(
            "/api/vis/charts/infodengue/rt/",
            {
                "disease": "dengue",
                "geocode": 2300101,
                "start": "2026-01-01",
                "end": "2026-01-01",
            },
        )
        self.assertEqual(r.status_code, 401)

    @patch("vis.charts.infodengue.get_infodengue_queryset")
    def test_rt_accepts_sdk_key(self, mock_qs):
        mock_qs.return_value.filter.return_value.values.return_value.order_by.return_value = (
            []
        )
        r = self.client.get(
            "/api/vis/charts/infodengue/rt/",
            {
                "disease": "dengue",
                "geocode": 2300101,
                "start": "2026-01-01",
                "end": "2026-01-01",
            },
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [200, 404])

    def test_rt_rejects_invalid_disease(self):
        r = self.client.get(
            "/api/vis/charts/infodengue/rt/",
            {
                "disease": "malaria",
                "geocode": 2300101,
                "start": "2026-01-01",
                "end": "2026-01-01",
            },
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])

    @patch("vis.charts.infodengue.get_infodengue_queryset")
    def test_total_cases_accepts_sdk_key(self, mock_qs):
        mock_qs.return_value.filter.return_value.aggregate.return_value = {
            "total": 0
        }
        r = self.client.get(
            "/api/vis/charts/infodengue/total-cases/",
            {
                "disease": "dengue",
                "geocode": 2300101,
                "start": "2026-01-01",
                "end": "2026-01-01",
            },
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [200, 404])

    def test_total_cases_rejects_no_auth(self):
        r = self.client.get(
            "/api/vis/charts/infodengue/total-cases/",
            {
                "disease": "dengue",
                "geocode": 2300101,
                "start": "2026-01-01",
                "end": "2026-01-01",
            },
        )
        self.assertEqual(r.status_code, 401)


class ContaOvosChartEndpointTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="contauser",
            email="conta@test.com",
            password="testpass",
        )
        self.sdk_key = self.user.rotate_sdk_key()

    def test_eggs_density_requires_auth(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2026-01-01", "end": "2026-03-01"},
        )
        self.assertEqual(r.status_code, 401)

    def test_eggs_density_accepts_sdk_key(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2026-01-01", "end": "2026-03-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_eggs_density_with_uf(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2026-01-01", "end": "2026-03-01", "uf": "SP"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_eggs_density_rejects_invalid_uf(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2026-01-01", "end": "2026-03-01", "uf": "XX"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])

    def test_positivity_accepts_sdk_key(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/positivity/",
            {"start": "2026-01-01", "end": "2026-03-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_map_accepts_sdk_key(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/map/",
            {"start": "2026-01-01", "end": "2026-03-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_map_scatter_accepts_sdk_key(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/map/scatter/",
            {"start": "2026-01-01", "end": "2026-03-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r.status_code, 200)

    def test_date_range_too_large_rejected(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2025-02-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])

    def test_end_before_start_rejected(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2026-06-01", "end": "2026-01-01"},
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertIn(r.status_code, [400, 422])


class SdkKeyRotationIntegrationTest(TestCase):
    """Test that SDK key rotation invalidates old key on chart endpoints."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="intuser",
            email="int@test.com",
            password="testpass",
        )
        self.sdk_key = self.user.rotate_sdk_key()
        self.chart_url = "/api/vis/charts/contaovos/eggs_density/"
        self.chart_params = {"start": "2024-01-01", "end": "2024-01-31"}

    def test_old_sdk_key_invalidated_after_rotation(self):
        r1 = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r1.status_code, 200)

        new_key = self.user.rotate_sdk_key()

        r2 = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r2.status_code, 401)

        r3 = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=new_key,
        )
        self.assertEqual(r3.status_code, 200)

    def test_expired_sdk_key_invalidated(self):
        r1 = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r1.status_code, 200)

        self.user.sdk_key_created_at = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=["sdk_key_created_at"])

        r2 = self.client.get(
            self.chart_url,
            self.chart_params,
            HTTP_X_SDK_KEY=self.sdk_key,
        )
        self.assertEqual(r2.status_code, 401)
