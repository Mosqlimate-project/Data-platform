import json
from datetime import date

from django.test import Client, TestCase
from django.contrib.auth import get_user_model
from ninja.errors import HttpError

from registry.schema import PredictionDataRowSchema, PredictionIn

User = get_user_model()


def _row(date_str):
    return {
        "date": date_str,
        "pred": 100.0,
        "lower_95": 0.0,
        "lower_90": 80.0,
        "lower_80": 85.0,
        "lower_50": 90.0,
        "upper_50": 110.0,
        "upper_80": 115.0,
        "upper_90": 120.0,
        "upper_95": 200.0,
    }


class PredictionDataRowSchemaTest(TestCase):
    def test_valid_bounds_accepted(self):
        row = PredictionDataRowSchema(
            date=date(2024, 1, 7),
            pred=100.0,
            lower_95=0.0,
            lower_90=80.0,
            lower_80=85.0,
            lower_50=90.0,
            upper_50=110.0,
            upper_80=115.0,
            upper_90=120.0,
            upper_95=200.0,
        )
        self.assertEqual(row.pred, 100.0)

    def test_negative_lower_bound_rejected(self):
        with self.assertRaises(HttpError):
            PredictionDataRowSchema(
                date=date(2024, 1, 7),
                pred=100.0,
                lower_95=-1.0,
                lower_90=80.0,
                lower_80=85.0,
                lower_50=90.0,
                upper_50=110.0,
                upper_80=115.0,
                upper_90=120.0,
                upper_95=200.0,
            )

    def test_upper_lower_than_lower_rejected(self):
        with self.assertRaises(HttpError):
            PredictionDataRowSchema(
                date=date(2024, 1, 7),
                pred=100.0,
                lower_95=0.0,
                lower_90=120.0,
                lower_80=85.0,
                lower_50=90.0,
                upper_50=110.0,
                upper_80=115.0,
                upper_90=120.0,
                upper_95=200.0,
            )

    def test_pred_outside_bounds_rejected(self):
        with self.assertRaises(HttpError):
            PredictionDataRowSchema(
                date=date(2024, 1, 7),
                pred=100.0,
                lower_95=0.0,
                lower_90=80.0,
                lower_80=85.0,
                lower_50=110.0,
                upper_50=115.0,
                upper_80=120.0,
                upper_90=125.0,
                upper_95=200.0,
            )

    def test_upper_95_before_upper_90_rejected(self):
        with self.assertRaises(HttpError):
            PredictionDataRowSchema(
                date=date(2024, 1, 7),
                pred=100.0,
                lower_95=0.0,
                lower_90=80.0,
                lower_80=85.0,
                lower_50=90.0,
                upper_50=110.0,
                upper_80=115.0,
                upper_90=200.0,
                upper_95=120.0,
            )


class PredictionInSchemaTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.client = Client()
        self.auth_headers = {"HTTP_X_UID_KEY": self.user.api_key()}

    def test_invalid_commit_hash_rejected(self):
        payload = {
            "repository": "owner/repo",
            "disease": "A90",
            "description": "Test",
            "commit": "too-short",
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "prediction": [
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 80.0,
                    "upper_90": 120.0,
                }
            ],
        }
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_invalid_repository_format_rejected(self):
        payload = {
            "repository": "no-slash",
            "disease": "A90",
            "description": "Test",
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "prediction": [
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 80.0,
                    "upper_90": 120.0,
                }
            ],
        }
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_description_too_long_rejected(self):
        payload = {
            "repository": "owner/repo",
            "disease": "A90",
            "description": "x" * 501,
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "prediction": [
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 80.0,
                    "upper_90": 120.0,
                }
            ],
        }
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_missing_adm_0_for_all_levels(self):
        payload = {
            "repository": "owner/repo",
            "disease": "A90",
            "description": "Test",
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "",
            "prediction": [
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 80.0,
                    "upper_90": 120.0,
                }
            ],
        }
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_missing_adm_1_when_adm_level_1(self):
        payload = {
            "repository": "owner/repo",
            "disease": "A90",
            "description": "Test",
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 1,
            "adm_0": "BRA",
            "adm_1": None,
            "prediction": [
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 80.0,
                    "upper_90": 120.0,
                }
            ],
        }
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_commit_hash_is_lowered(self):
        mixed_hash = "A" * 10 + "b" * 10 + "C" * 10 + "d" * 10
        schema = PredictionIn(
            repository="owner/repo",
            disease="A90",
            description="Test",
            commit=mixed_hash,
            case_definition="probable",
            published=True,
            adm_level=0,
            adm_0="BRA",
            prediction=[
                PredictionDataRowSchema(
                    date=date(2024, 1, 7),
                    pred=100.0,
                    lower_95=0.0,
                    lower_90=80.0,
                    lower_80=85.0,
                    lower_50=90.0,
                    upper_50=110.0,
                    upper_80=115.0,
                    upper_90=120.0,
                    upper_95=200.0,
                )
            ],
        )
        self.assertEqual(schema.commit, mixed_hash.lower())

    def test_week_gap_detected(self):
        with self.assertRaisesRegex(HttpError, "Gap detected: missing week"):
            PredictionIn.model_validate(
                {
                    "repository": "owner/repo",
                    "disease": "A90",
                    "description": "Test",
                    "commit": "a" * 40,
                    "case_definition": "probable",
                    "published": True,
                    "adm_level": 0,
                    "adm_0": "BRA",
                    "prediction": [
                        _row("2024-01-07"),
                        _row("2024-01-21"),
                    ],
                },
                context={"time_resolution": "week", "is_sprint": False},
            )

    def test_day_gap_detected(self):
        with self.assertRaisesRegex(HttpError, "Gap detected: missing day"):
            PredictionIn.model_validate(
                {
                    "repository": "owner/repo",
                    "disease": "A90",
                    "description": "Test",
                    "commit": "a" * 40,
                    "case_definition": "probable",
                    "published": True,
                    "adm_level": 0,
                    "adm_0": "BRA",
                    "prediction": [
                        _row("2024-01-01"),
                        _row("2024-01-03"),
                    ],
                },
                context={"time_resolution": "day", "is_sprint": False},
            )

    def test_week_date_not_cdc_start_detected(self):
        with self.assertRaisesRegex(HttpError, "is not the start of CDC week"):
            PredictionIn.model_validate(
                {
                    "repository": "owner/repo",
                    "disease": "A90",
                    "description": "Test",
                    "commit": "a" * 40,
                    "case_definition": "probable",
                    "published": True,
                    "adm_level": 0,
                    "adm_0": "BRA",
                    "prediction": [
                        _row("2024-01-07"),
                        _row("2024-01-15"),
                    ],
                },
                context={"time_resolution": "week", "is_sprint": False},
            )

    def test_sprint_missing_dates_detected(self):
        from epiweeks import Week

        year = 2024
        start = Week(year - 1, 41).startdate()
        with self.assertRaisesRegex(
            HttpError, "missing from your predictions"
        ):
            PredictionIn.model_validate(
                {
                    "repository": "owner/repo",
                    "disease": "A90",
                    "description": "Test",
                    "commit": "a" * 40,
                    "case_definition": "probable",
                    "published": True,
                    "adm_level": 0,
                    "adm_0": "BRA",
                    "prediction": [
                        _row(start.isoformat()),
                    ],
                },
                context={"time_resolution": "week", "is_sprint": True},
            )
