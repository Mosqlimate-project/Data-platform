from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model

from registry import models as m
from datastore.models import ICD, Disease, Adm0

User = get_user_model()


class UpdateModelTimestampSignalTest(TestCase):
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
            system="ICD-10",
            version="2010",
        )
        self.disease, _ = Disease.objects.get_or_create(
            icd=self.icd,
            code="A90",
            defaults={"name": "Dengue fever"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )

    def test_prediction_creation_updates_model_timestamp(self):
        original_updated = self.model.updated

        m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
        )

        self.model.refresh_from_db()
        self.assertGreaterEqual(self.model.updated, original_updated)

    def test_quantitative_prediction_creation_updates_model_timestamp(self):
        original_updated = self.model.updated

        with patch("registry.tasks.update_prediction_scores") as mock_task:
            mock_task.delay = lambda *args, **kwargs: None

            m.QuantitativePrediction.objects.create(
                model=self.model,
                disease=self.disease,
                adm_level=0,
                adm0=self.adm0,
                commit="b" * 40,
            )

        self.model.refresh_from_db()
        self.assertGreater(self.model.updated, original_updated)

    def test_multiple_predictions_update_timestamp(self):
        m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="c" * 40,
        )
        first_update = m.RepositoryModel.objects.get(pk=self.model.pk).updated

        m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="d" * 40,
        )

        self.model.refresh_from_db()
        self.assertGreaterEqual(self.model.updated, first_update)


class ScoreUpdateTriggerSignalTest(TestCase):
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
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        self.icd, _ = ICD.objects.get_or_create(
            system="ICD-10",
            version="2010",
        )
        self.disease, _ = Disease.objects.get_or_create(
            icd=self.icd,
            code="A90",
            defaults={"name": "Dengue fever"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )

    def test_score_update_triggered_on_creation(self):
        prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="e" * 40,
        )

        self.assertIsNotNone(prediction.id)
