import json
from datetime import date, timedelta

from django.test import Client, TestCase
from django.contrib.auth import get_user_model

from registry import models as m
from datastore.models import ICD, Disease, Adm0, Adm1, Adm2

User = get_user_model()


class RegistryAPITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth_headers = {"HTTP_X_UID_KEY": self.user.api_key()}

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@test.com",
            password="testpass",
            is_active=True,
        )
        self.other_headers = {"HTTP_X_UID_KEY": self.other_user.api_key()}

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
        self.disease_code = "A90"
        self.disease, _ = Disease.objects.get_or_create(
            icd=self.icd,
            code=self.disease_code,
            defaults={"name": "Dengue fever"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )

    def _create_prediction_payload(self, **overrides):
        payload = {
            "repository": f"{self.user.username}/{self.repo.name}",
            "disease": self.disease_code,
            "description": "Test prediction for integration testing",
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "adm_1": None,
            "adm_2": None,
            "adm_3": None,
            "prediction": [
                {
                    "date": (
                        date(2024, 1, 7) + timedelta(weeks=i)
                    ).isoformat(),
                    "pred": 100.0 + i,
                    "lower_95": 80.0 + i,
                    "lower_90": 85.0 + i,
                    "lower_80": 88.0 + i,
                    "lower_50": 92.0 + i,
                    "upper_50": 108.0 + i,
                    "upper_80": 112.0 + i,
                    "upper_90": 115.0 + i,
                    "upper_95": 120.0 + i,
                }
                for i in range(4)
            ],
        }
        payload.update(overrides)
        return payload

    def _create_prediction(self):
        m.RepositoryContributor.objects.get_or_create(
            user=self.user,
            repository=self.repo,
            defaults={"permission": m.RepositoryContributor.Permissions.WRITE},
        )
        prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
            description="Test prediction",
            published=True,
        )
        m.QuantitativePredictionRow.objects.create(
            prediction=prediction,
            date=date(2024, 1, 7),
            pred=100.0,
            lower_90=85.0,
            upper_90=115.0,
        )
        return prediction


class ListModelsTest(RegistryAPITestCase):
    def test_list_models_returns_200(self):
        response = self.client.get(
            "/api/registry/models/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)
        self.assertIn("pagination", data)
        self.assertGreaterEqual(len(data["items"]), 1)

    def test_list_models_requires_auth(self):
        response = self.client.get("/api/registry/models/")
        self.assertNotEqual(response.status_code, 200)

    def test_list_models_with_filters(self):
        response = self.client.get(
            "/api/registry/models/?category=quantitative",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(
            all(item["category"] == "quantitative" for item in data["items"])
        )

    def test_list_models_with_disease_filter(self):
        response = self.client.get(
            f"/api/registry/models/?disease={self.disease_code}",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_list_models_pagination(self):
        response = self.client.get(
            "/api/registry/models/?page=1&per_page=2",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertLessEqual(len(data["items"]), 2)


class GetModelTest(RegistryAPITestCase):
    def test_get_model_returns_200(self):
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], self.model.id)
        self.assertEqual(data["category"], "quantitative")

    def test_get_model_not_found(self):
        response = self.client.get(
            "/api/registry/models/nonexistent/nonexistent/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_model_requires_auth(self):
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
        )
        self.assertNotEqual(response.status_code, 200)


class ListPredictionsTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        self.prediction = self._create_prediction()

    def test_list_predictions_returns_200(self):
        response = self.client.get(
            "/api/registry/predictions/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)
        self.assertIn("pagination", data)

    def test_list_predictions_with_filters(self):
        response = self.client.get(
            f"/api/registry/predictions/?disease={self.disease_code}&adm_level=0",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_list_predictions_requires_auth(self):
        response = self.client.get("/api/registry/predictions/")
        self.assertNotEqual(response.status_code, 200)


class CreatePredictionTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.get_or_create(
            user=self.user,
            repository=self.repo,
            defaults={"permission": m.RepositoryContributor.Permissions.WRITE},
        )

    def test_create_prediction_returns_201(self):
        payload = self._create_prediction_payload()
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)

    def test_create_prediction_nonexistent_repo(self):
        payload = self._create_prediction_payload(
            repository="nonexistent/repo"
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_nonexistent_disease(self):
        payload = self._create_prediction_payload(disease="Z99")
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_no_permission(self):
        payload = self._create_prediction_payload()
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_create_prediction_requires_auth(self):
        payload = self._create_prediction_payload()
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertNotEqual(response.status_code, 201)

    def test_create_prediction_invalid_commit_hash(self):
        payload = self._create_prediction_payload(commit="short")
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_empty_description(self):
        payload = self._create_prediction_payload(description="")
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_empty_list(self):
        payload = self._create_prediction_payload(prediction=[])
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_duplicate_dates(self):
        payload = self._create_prediction_payload(
            prediction=[
                {
                    "date": "2024-01-07",
                    "pred": 100.0,
                    "lower_90": 85.0,
                    "upper_90": 115.0,
                },
                {
                    "date": "2024-01-07",
                    "pred": 200.0,
                    "lower_90": 185.0,
                    "upper_90": 215.0,
                },
            ]
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_missing_adm_fields(self):
        payload = self._create_prediction_payload(adm_level=1)
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)


class CreatePredictionWithADMTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.get_or_create(
            user=self.user,
            repository=self.repo,
            defaults={"permission": m.RepositoryContributor.Permissions.WRITE},
        )
        self.adm1, _ = Adm1.objects.get_or_create(
            geocode="33",
            defaults={"name": "Rio de Janeiro", "country": self.adm0},
        )
        self.adm2, _ = Adm2.objects.get_or_create(
            geocode="3304557",
            defaults={"name": "Rio de Janeiro", "adm1": self.adm1},
        )

    def test_create_prediction_adm_level_0(self):
        payload = self._create_prediction_payload(adm_level=0)
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_adm_level_1(self):
        payload = self._create_prediction_payload(
            adm_level=1,
            adm_1="33",
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_adm_level_2(self):
        payload = self._create_prediction_payload(
            adm_level=2,
            adm_1="33",
            adm_2="3304557",
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_nonexistent_adm_2(self):
        payload = self._create_prediction_payload(
            adm_level=2,
            adm_1="33",
            adm_2="9999999",
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)


class GetPredictionTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        self.prediction = self._create_prediction()

    def test_get_prediction_returns_200(self):
        response = self.client.get(
            f"/api/registry/predictions/{self.prediction.id}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], self.prediction.id)
        self.assertIn("data", data)

    def test_get_prediction_not_found(self):
        response = self.client.get(
            "/api/registry/predictions/99999/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_prediction_requires_auth(self):
        response = self.client.get(
            f"/api/registry/predictions/{self.prediction.id}/",
        )
        self.assertNotEqual(response.status_code, 200)


class PredictionDataTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        self.prediction = self._create_prediction()

    def test_get_prediction_data_returns_200(self):
        response = self.client.get(
            f"/api/registry/predictions/{self.prediction.id}/data/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)

    def test_get_prediction_data_not_found(self):
        response = self.client.get(
            "/api/registry/predictions/99999/data/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_get_prediction_data_requires_auth(self):
        response = self.client.get(
            f"/api/registry/predictions/{self.prediction.id}/data/",
        )
        self.assertNotEqual(response.status_code, 200)


class DeletePredictionTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.get_or_create(
            user=self.user,
            repository=self.repo,
            defaults={"permission": m.RepositoryContributor.Permissions.WRITE},
        )
        self.prediction = self._create_prediction()

    def test_delete_prediction_returns_200(self):
        response = self.client.delete(
            f"/api/registry/predictions/{self.prediction.id}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_nonexistent_prediction(self):
        response = self.client.delete(
            "/api/registry/predictions/99999/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_prediction_no_permission(self):
        response = self.client.delete(
            f"/api/registry/predictions/{self.prediction.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_prediction_requires_auth(self):
        response = self.client.delete(
            f"/api/registry/predictions/{self.prediction.id}/",
        )
        self.assertNotEqual(response.status_code, 200)


class PublishPredictionTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.get_or_create(
            user=self.user,
            repository=self.repo,
            defaults={"permission": m.RepositoryContributor.Permissions.WRITE},
        )
        self.prediction = self._create_prediction()

    def test_publish_prediction_returns_201(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.prediction.refresh_from_db()
        self.assertFalse(self.prediction.published)

    def test_publish_prediction_not_found(self):
        response = self.client.patch(
            "/api/registry/prediction/99999/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_publish_prediction_no_permission(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)


class ModelDetailInternalTest(RegistryAPITestCase):
    def test_get_model_detail_internal(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["description"], "A test model")
        self.assertEqual(data["category"], "quantitative")

    def test_get_model_detail_not_found(self):
        response = self.client.get(
            "/api/registry/model/nonexistent/nonexistent/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)


class ModelPredictionsInternalTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        self._create_prediction()

    def test_model_predictions_returns_200(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/predictions/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_model_predictions_not_found(self):
        response = self.client.get(
            "/api/registry/model/nonexistent/nonexistent/predictions/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)


class PredictionVisibilityTest(RegistryAPITestCase):
    def setUp(self):
        super().setUp()
        self.org = m.Organization.objects.create(name="testorg")
        self.org_repo = m.Repository.objects.create(
            repo_id="67890",
            name="org-repo",
            provider="github",
            organization=self.org,
            active=True,
        )
        self.org_model = m.RepositoryModel.objects.create(
            repository=self.org_repo,
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        m.OrganizationMembership.objects.create(
            user=self.user,
            organization=self.org,
            role=m.OrganizationMembership.Roles.OWNER,
        )

    def _create_org_prediction(self, published=True):
        prediction = m.QuantitativePrediction.objects.create(
            model=self.org_model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="z" * 40,
            description="Org prediction",
            published=published,
        )
        return prediction

    def test_owner_sees_org_prediction(self):
        prediction = self._create_org_prediction()
        response = self.client.get(
            f"/api/registry/predictions/{prediction.id}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_stranger_sees_published_prediction(self):
        prediction = self._create_org_prediction(published=True)
        response = self.client.get(
            f"/api/registry/predictions/{prediction.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_stranger_cannot_see_unpublished_prediction(self):
        prediction = self._create_org_prediction(published=False)
        response = self.client.get(
            f"/api/registry/predictions/{prediction.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)
