from datetime import date

from django.test import TestCase
from django.contrib.auth import get_user_model

from registry import models as m
from registry import schema as s
from datastore.models import ICD, Disease, Adm0, Adm1, Adm2, Adm3

User = get_user_model()


class BaseResolverTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.org = m.Organization.objects.create(name="testorg")
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
        self.adm1, _ = Adm1.objects.get_or_create(
            geocode="33",
            defaults={"name": "Rio de Janeiro", "country": self.adm0},
        )
        self.adm2, _ = Adm2.objects.get_or_create(
            geocode="3304557",
            defaults={"name": "Rio de Janeiro", "adm1": self.adm1},
        )
        self.adm3, _ = Adm3.objects.get_or_create(
            geocode="3304557XXXX",
            defaults={"name": "Sub-municipality", "adm2": self.adm2},
        )

    def _create_prediction(self, **kwargs):
        values = dict(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
            description="Test",
            published=True,
        )
        values.update(kwargs)
        return m.QuantitativePrediction.objects.create(**values)


class ModelResolverTest(BaseResolverTestCase):
    def test_resolve_repository_with_owner(self):
        self.assertEqual(
            s.Model.resolve_repository(self.model), "testuser/test-repo"
        )

    def test_resolve_repository_with_organization(self):
        self.model.repository.owner = None
        self.model.repository.organization = self.org
        self.model.repository.save()
        self.assertEqual(
            s.Model.resolve_repository(self.model), "testorg/test-repo"
        )

    def test_resolve_repository_raises_when_no_owner(self):
        self.model.repository.owner = None
        self.model.repository.organization = None
        with self.assertRaises(ValueError):
            s.Model.resolve_repository(self.model)

    def test_resolve_imdc_year_with_sprint(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.assertEqual(s.Model.resolve_imdc_year(self.model), 2024)

    def test_resolve_imdc_year_without_sprint(self):
        self.assertIsNone(s.Model.resolve_imdc_year(self.model))

    def test_resolve_predictions_count_cached(self):
        self.assertEqual(s.Model.resolve_predictions_count(self.model), 0)

    def test_resolve_predictions_count_uses_annotate(self):
        self._create_prediction()
        obj = type(
            "Obj",
            (),
            {"predicts": self.model.predicts, "predictions_count": 5},
        )
        self.assertEqual(s.Model.resolve_predictions_count(obj), 5)

    def test_resolve_active(self):
        self.assertTrue(s.Model.resolve_active(self.model))

    def test_resolve_created_at(self):
        self.assertEqual(
            s.Model.resolve_created_at(self.model), self.model.created.date()
        )

    def test_resolve_last_update(self):
        self.assertEqual(
            s.Model.resolve_last_update(self.model), self.model.updated.date()
        )


class PredictionResolverTest(BaseResolverTestCase):
    def test_resolve_disease(self):
        pred = self._create_prediction()
        self.assertEqual(s.Prediction.resolve_disease(pred), "A90")

    def test_resolve_start_from_annotation(self):
        self._create_prediction()
        obj = type("Obj", (), {"start_date": date(2024, 1, 7)})
        self.assertEqual(s.Prediction.resolve_start(obj), date(2024, 1, 7))

    def test_resolve_start_from_child_data(self):
        pred = self._create_prediction()
        m.QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=100.0,
            lower_90=80.0,
            upper_90=120.0,
        )
        self.assertEqual(s.Prediction.resolve_start(pred), date(2024, 1, 7))

    def test_resolve_start_none(self):
        pred = self._create_prediction()
        self.assertIsNone(s.Prediction.resolve_start(pred))

    def test_resolve_end_from_annotation(self):
        obj = type("Obj", (), {"end_date": date(2024, 1, 7)})
        self.assertEqual(s.Prediction.resolve_end(obj), date(2024, 1, 7))

    def test_resolve_end_from_child_data(self):
        pred = self._create_prediction()
        m.QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=100.0,
            lower_90=80.0,
            upper_90=120.0,
        )
        self.assertEqual(s.Prediction.resolve_end(pred), date(2024, 1, 7))

    def test_resolve_end_none(self):
        pred = self._create_prediction()
        self.assertIsNone(s.Prediction.resolve_end(pred))


class PredictionAdmResolverTest(BaseResolverTestCase):
    def test_resolve_adm_0_national(self):
        pred = self._create_prediction(adm_level=0, adm0=self.adm0)
        self.assertEqual(s.Prediction.resolve_adm_0(pred), "BRA")

    def test_resolve_adm_0_state(self):
        pred = self._create_prediction(
            adm_level=1, adm0=self.adm0, adm1=self.adm1
        )
        self.assertEqual(s.Prediction.resolve_adm_0(pred), "BRA")

    def test_resolve_adm_0_municipality(self):
        pred = self._create_prediction(
            adm_level=2,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
        )
        self.assertEqual(s.Prediction.resolve_adm_0(pred), "BRA")

    def test_resolve_adm_0_submunicipality(self):
        pred = self._create_prediction(
            adm_level=3,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
            adm3=self.adm3,
        )
        self.assertEqual(s.Prediction.resolve_adm_0(pred), "BRA")

    def test_resolve_adm_1_national_none(self):
        pred = self._create_prediction(adm_level=0, adm0=self.adm0)
        self.assertIsNone(s.Prediction.resolve_adm_1(pred))

    def test_resolve_adm_1_state(self):
        pred = self._create_prediction(
            adm_level=1, adm0=self.adm0, adm1=self.adm1
        )
        self.assertEqual(s.Prediction.resolve_adm_1(pred), "33")

    def test_resolve_adm_1_municipality(self):
        pred = self._create_prediction(
            adm_level=2,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
        )
        self.assertEqual(s.Prediction.resolve_adm_1(pred), "33")

    def test_resolve_adm_1_submunicipality(self):
        pred = self._create_prediction(
            adm_level=3,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
            adm3=self.adm3,
        )
        self.assertEqual(s.Prediction.resolve_adm_1(pred), "33")

    def test_resolve_adm_2_national_none(self):
        pred = self._create_prediction(adm_level=0, adm0=self.adm0)
        self.assertIsNone(s.Prediction.resolve_adm_2(pred))

    def test_resolve_adm_2_state_none(self):
        pred = self._create_prediction(
            adm_level=1, adm0=self.adm0, adm1=self.adm1
        )
        self.assertIsNone(s.Prediction.resolve_adm_2(pred))

    def test_resolve_adm_2_municipality(self):
        pred = self._create_prediction(
            adm_level=2,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
        )
        self.assertEqual(s.Prediction.resolve_adm_2(pred), "3304557")

    def test_resolve_adm_2_submunicipality(self):
        pred = self._create_prediction(
            adm_level=3,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
            adm3=self.adm3,
        )
        self.assertEqual(s.Prediction.resolve_adm_2(pred), "3304557")

    def test_resolve_adm_3_when_present(self):
        pred = self._create_prediction(
            adm_level=3,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
            adm3=self.adm3,
        )
        self.assertEqual(s.Prediction.resolve_adm_3(pred), "3304557XXXX")

    def test_resolve_adm_3_when_absent(self):
        pred = self._create_prediction(adm_level=0, adm0=self.adm0)
        self.assertIsNone(s.Prediction.resolve_adm_3(pred))


class PredictionScoresResolverTest(BaseResolverTestCase):
    def test_resolve_scores_empty_without_child(self):
        pred = m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="b" * 40,
        )
        self.assertEqual(s.Prediction.resolve_scores(pred), {})

    def test_resolve_scores_with_values(self):
        pred = self._create_prediction(
            mae_score=1.234,
            mse_score=2.345,
            crps_score=3.456,
            log_score=4.567,
            interval_score=5.678,
            wis_score=6.789,
        )
        scores = s.Prediction.resolve_scores(pred)
        self.assertEqual(scores["mae"], 1.23)
        self.assertEqual(scores["mse"], 2.35)


class ModelThumbsResolverTest(BaseResolverTestCase):
    def setUp(self):
        super().setUp()
        self.pred = self._create_prediction()

    def test_resolve_model_id(self):
        self.assertEqual(
            s.ModelThumbs.resolve_model_id(self.model), self.model.id
        )

    def test_resolve_owner_with_owner(self):
        self.assertEqual(s.ModelThumbs.resolve_owner(self.model), "testuser")

    def test_resolve_owner_with_organization(self):
        self.model.repository.owner = None
        self.model.repository.organization = self.org
        self.model.repository.save()
        self.assertEqual(s.ModelThumbs.resolve_owner(self.model), "testorg")

    def test_resolve_owner_raises(self):
        self.model.repository.owner = None
        self.model.repository.organization = None
        with self.assertRaises(ValueError):
            s.ModelThumbs.resolve_owner(self.model)

    def test_resolve_repository(self):
        self.assertEqual(
            s.ModelThumbs.resolve_repository(self.model), "test-repo"
        )

    def test_resolve_avatar_url_falls_back_to_repo(self):
        self.assertEqual(
            s.ModelThumbs.resolve_avatar_url(self.model),
            self.model.repository.avatar_url,
        )

    def test_resolve_diseases(self):
        self.assertEqual(s.ModelThumbs.resolve_diseases(self.model), ["A90"])

    def test_resolve_predictions(self):
        obj = type("Obj", (), {"predictions_count": 3})
        self.assertEqual(s.ModelThumbs.resolve_predictions(obj), 3)

    def test_resolve_last_update(self):
        self.assertEqual(
            s.ModelThumbs.resolve_last_update(self.model),
            self.model.updated.timestamp(),
        )

    def test_resolve_category_display(self):
        self.assertEqual(
            s.ModelThumbs.resolve_category_display(self.model), "Quantitative"
        )

    def test_resolve_category_display_none(self):
        obj = type("Obj", (), {"category": None})
        self.assertIsNone(s.ModelThumbs.resolve_category_display(obj))

    def test_resolve_time_resolution_display(self):
        self.assertEqual(
            s.ModelThumbs.resolve_time_resolution_display(self.model), "Week"
        )

    def test_resolve_time_resolution_display_none(self):
        obj = type("Obj", (), {"time_resolution": None})
        self.assertIsNone(s.ModelThumbs.resolve_time_resolution_display(obj))

    def test_resolve_adm_levels(self):
        self.assertEqual(
            s.ModelThumbs.resolve_adm_levels(self.model), ["National"]
        )

    def test_resolve_imdc_year_with_sprint(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.assertEqual(
            s.ModelThumbs.resolve_imdc_year(self.model), "IMDC 2024"
        )

    def test_resolve_imdc_year_none(self):
        self.assertIsNone(s.ModelThumbs.resolve_imdc_year(self.model))


class ModelOutResolverTest(BaseResolverTestCase):
    def setUp(self):
        super().setUp()
        self.pred = self._create_prediction()

    def test_resolve_owner(self):
        self.assertEqual(s.ModelOut.resolve_owner(self.model), "testuser")

    def test_resolve_owner_raises(self):
        self.model.repository.owner = None
        self.model.repository.organization = None
        with self.assertRaises(ValueError):
            s.ModelOut.resolve_owner(self.model)

    def test_resolve_avatar_url(self):
        self.assertEqual(
            s.ModelOut.resolve_avatar_url(self.model),
            self.model.repository.avatar_url,
        )

    def test_resolve_diseases(self):
        self.assertEqual(s.ModelOut.resolve_diseases(self.model), ["A90"])

    def test_resolve_adm_levels(self):
        self.assertEqual(s.ModelOut.resolve_adm_levels(self.model), [0])

    def test_resolve_repository(self):
        self.assertEqual(
            s.ModelOut.resolve_repository(self.model), "test-repo"
        )

    def test_resolve_contributors_includes_owner(self):
        contributors = s.ModelOut.resolve_contributors(self.model)
        usernames = [c["username"] for c in contributors]
        self.assertIn("testuser", usernames)

    def test_resolve_contributors_includes_repo_contributor(self):
        other = User.objects.create_user(
            username="contrib",
            email="contrib@test.com",
            password="testpass",
        )
        m.RepositoryContributor.objects.create(
            user=other,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        contributors = s.ModelOut.resolve_contributors(self.model)
        usernames = [c["username"] for c in contributors]
        self.assertIn("contrib", usernames)


class ModelPredictionOutResolverTest(BaseResolverTestCase):
    def setUp(self):
        super().setUp()
        self.pred = self._create_prediction(
            adm_level=2,
            adm0=self.adm0,
            adm1=self.adm1,
            adm2=self.adm2,
            mae_score=1.23,
        )

    def test_resolve_date(self):
        self.assertEqual(
            s.ModelPredictionOut.resolve_date(self.pred),
            self.pred.created_at.date(),
        )

    def test_resolve_imdc_year_with_sprint(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.model.save()
        self.assertEqual(
            s.ModelPredictionOut.resolve_imdc_year(self.pred), 2024
        )

    def test_resolve_imdc_year_none(self):
        self.assertIsNone(s.ModelPredictionOut.resolve_imdc_year(self.pred))

    def test_resolve_adm_0_name_and_code(self):
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_0_name(self.pred),
            self.adm0.name,
        )
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_0_code(self.pred), "BRA"
        )

    def test_resolve_adm_1_name_and_code(self):
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_1_name(self.pred),
            "Rio de Janeiro",
        )
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_1_code(self.pred), "33"
        )

    def test_resolve_adm_2_name_and_code(self):
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_2_name(self.pred),
            "Rio de Janeiro",
        )
        self.assertEqual(
            s.ModelPredictionOut.resolve_adm_2_code(self.pred), "3304557"
        )

    def test_resolve_adm_3_none(self):
        self.assertIsNone(s.ModelPredictionOut.resolve_adm_3_name(self.pred))
        self.assertIsNone(s.ModelPredictionOut.resolve_adm_3_code(self.pred))

    def test_resolve_scores(self):
        scores = s.ModelPredictionOut.resolve_scores(self.pred)
        self.assertIsInstance(scores, list)
        self.assertEqual(len(scores), 1)
        self.assertEqual(scores[0]["name"], "mae_score")
        self.assertEqual(scores[0]["score"], 1.23)
