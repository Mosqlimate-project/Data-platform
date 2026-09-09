from datetime import date
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model

from registry import models as m
from registry.tasks import update_prediction_scores
from datastore.models import ICD, Disease, Adm0

User = get_user_model()


class UpdatePredictionScoresTaskTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
            active=True,
        )
        self.model = m.RepositoryModel.objects.create(
            repository=self.repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        self.icd, _ = ICD.objects.get_or_create(
            system="ICD-10", version="2010"
        )
        self.disease, _ = Disease.objects.get_or_create(
            icd=self.icd,
            code="A90",
            defaults={"name": "Dengue"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA", defaults={"name": "Brazil"}
        )

    def _create_prediction(self, **kwargs):
        values = dict(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
            description="Test",
        )
        values.update(kwargs)
        return m.QuantitativePrediction.objects.create(**values)

    def test_runs_with_no_prediction_ids(self):
        with patch(
            "registry.tasks.calculate_score",
            return_value={
                "mae": 1.0,
                "mse": 2.0,
                "crps": 3.0,
                "log_score": 4.0,
                "interval_score": 5.0,
                "wis": 6.0,
            },
        ):
            pred = self._create_prediction()
            m.QuantitativePredictionRow.objects.create(
                prediction=pred,
                date=date.today(),
                pred=10.0,
                lower_90=8.0,
                upper_90=12.0,
            )
            update_prediction_scores()
            pred.refresh_from_db()
            self.assertEqual(pred.mae_score, 1.0)

    def test_runs_with_specific_ids(self):
        with patch(
            "registry.tasks.calculate_score",
            return_value={
                "mae": 1.0,
                "mse": 2.0,
                "crps": 3.0,
                "log_score": 4.0,
                "interval_score": 5.0,
                "wis": 6.0,
            },
        ):
            pred = self._create_prediction()
            update_prediction_scores([pred.id])
            pred.refresh_from_db()
            self.assertEqual(pred.mse_score, 2.0)

    def test_skips_prediction_when_scores_match(self):
        with patch(
            "registry.tasks.calculate_score",
            return_value={
                "mae": None,
                "mse": None,
                "crps": None,
                "log_score": None,
                "interval_score": None,
                "wis": None,
            },
        ):
            pred = self._create_prediction()
            m.QuantitativePredictionRow.objects.create(
                prediction=pred,
                date=date.today(),
                pred=10.0,
                lower_90=8.0,
                upper_90=12.0,
            )
            update_prediction_scores([pred.id])
            pred.refresh_from_db()
            self.assertIsNone(pred.mae_score)

    def test_calculate_score_raises_exception_is_skipped(self):
        with patch(
            "registry.tasks.calculate_score",
            side_effect=Exception("boom"),
        ):
            pred = self._create_prediction()
            m.QuantitativePredictionRow.objects.create(
                prediction=pred,
                date=date.today(),
                pred=10.0,
                lower_90=8.0,
                upper_90=12.0,
            )
            update_prediction_scores([pred.id])
            pred.refresh_from_db()
            self.assertIsNone(pred.mae_score)

    def test_empty_ids_uses_all(self):
        with patch(
            "registry.tasks.calculate_score",
            return_value={
                "mae": 9.9,
                "mse": 9.9,
                "crps": 9.9,
                "log_score": 9.9,
                "interval_score": 9.9,
                "wis": 9.9,
            },
        ):
            pred = self._create_prediction()
            m.QuantitativePredictionRow.objects.create(
                prediction=pred,
                date=date.today(),
                pred=10.0,
                lower_90=8.0,
                upper_90=12.0,
            )
            update_prediction_scores([])
            pred.refresh_from_db()
            self.assertEqual(pred.mae_score, 9.9)
