import json
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from django.test import Client, TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache

from registry import models as m
from users.jwt import create_access_token
from datastore.models import ICD, Disease, Adm0, Adm1, Adm2, Adm3

User = get_user_model()


class RegistryAPIComprehensiveTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth_headers = {"HTTP_X_UID_KEY": self.user.api_key()}
        self.jwt_token = create_access_token(
            {"sub": str(self.user.pk), "type": "access"}
        )
        self.jwt_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.jwt_token}"}

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@test.com",
            password="testpass",
            is_active=True,
        )
        self.other_headers = {"HTTP_X_UID_KEY": self.other_user.api_key()}
        self.other_jwt_token = create_access_token(
            {"sub": str(self.other_user.pk), "type": "access"}
        )
        self.other_jwt_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.other_jwt_token}"
        }

        self.super_user = User.objects.create_superuser(
            username="superuser",
            email="super@test.com",
            password="superpass",
            is_active=True,
        )
        self.super_headers = {"HTTP_X_UID_KEY": self.super_user.api_key()}
        self.super_jwt_token = create_access_token(
            {"sub": str(self.super_user.pk), "type": "access"}
        )
        self.super_jwt_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.super_jwt_token}"
        }

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
            description="Test prediction",
            published=True,
        )
        values.update(kwargs)
        return m.QuantitativePrediction.objects.create(**values)


class IsSprintActiveTest(RegistryAPIComprehensiveTestCase):
    def test_returns_200(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        response = self.client.get(
            "/api/registry/model/add/sprint/actives/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(sprint.id, [s["id"] for s in data])

    def test_requires_auth(self):
        response = self.client.get("/api/registry/model/add/sprint/actives/")
        self.assertEqual(response.status_code, 401)


class ModelAddTest(RegistryAPIComprehensiveTestCase):
    def test_add_new_model_as_owner(self):
        payload = {
            "repo_id": 99999,
            "repo_url": "https://github.com/testuser/new-repo",
            "repo_name": "new-repo",
            "repo_private": False,
            "repo_provider": "github",
            "time_resolution": "week",
            "category": "quantitative",
            "sprint": 0,
        }
        response = self.client.post(
            "/api/registry/model/add/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["action"], "created")

    def test_add_model_as_organization(self):
        payload = {
            "repo_id": 99998,
            "repo_url": "https://github.com/orgname/new-repo",
            "repo_name": "new-repo",
            "repo_private": False,
            "repo_provider": "github",
            "time_resolution": "week",
            "category": "quantitative",
            "sprint": 0,
        }
        response = self.client.post(
            "/api/registry/model/add/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(m.Organization.objects.filter(name="orgname").exists())

    def test_add_model_updates_existing(self):
        payload = {
            "repo_id": self.repo.repo_id,
            "repo_url": f"https://github.com/{self.user.username}/{self.repo.name}",
            "repo_name": self.repo.name,
            "repo_private": False,
            "repo_provider": "github",
            "time_resolution": "week",
            "category": "categorical",
            "sprint": 0,
        }
        response = self.client.post(
            "/api/registry/model/add/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["action"], "updated")

    def test_add_model_invalid_url(self):
        payload = {
            "repo_id": 11111,
            "repo_url": "invalid-url",
            "repo_name": "repo",
            "repo_private": False,
            "repo_provider": "github",
            "time_resolution": "week",
            "category": "quantitative",
            "sprint": 0,
        }
        response = self.client.post(
            "/api/registry/model/add/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_requires_auth(self):
        payload = {
            "repo_id": 11111,
            "repo_url": "https://github.com/test/repo",
            "repo_name": "repo",
            "repo_private": False,
            "repo_provider": "github",
            "time_resolution": "week",
            "category": "quantitative",
            "sprint": 0,
        }
        response = self.client.post(
            "/api/registry/model/add/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)


class ModelsThumbnailsTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
            published=True,
        )

    def test_returns_models_with_predictions(self):
        response = self.client.get("/api/registry/models/thumbnails/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)

    def test_superuser_sees_all(self):
        response = self.client.get(
            "/api/registry/models/thumbnails/",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_inactive_repo_hidden_for_anonymous(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get("/api/registry/models/thumbnails/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_owner_sees_inactive_repo(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            "/api/registry/models/thumbnails/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 1)


class ModelsTagsTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
            published=True,
        )

    def test_returns_tags(self):
        response = self.client.get("/api/registry/models/tags/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data), 0)

    def test_regular_user_gets_tags(self):
        response = self.client.get(
            "/api/registry/models/tags/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data), 0)

    def test_filter_by_ids(self):
        response = self.client.get(
            f"/api/registry/models/tags/?ids={self.model.id}"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data), 0)

    def test_superuser_sees_all(self):
        response = self.client.get(
            "/api/registry/models/tags/",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_inactive_repo_hidden_for_anonymous(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get("/api/registry/models/tags/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_sprint_tag(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.model.save()
        response = self.client.get("/api/registry/models/tags/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        names = [t["name"] for t in data]
        self.assertIn("2024", names)


class RepositoryOwnerTest(RegistryAPIComprehensiveTestCase):
    def test_returns_owner(self):
        response = self.client.get(
            "/api/registry/model/testuser/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["owner"], "testuser")


class RepositoryModelInternalTest(RegistryAPIComprehensiveTestCase):
    def test_returns_model_200(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_inactive_repo_visible_to_owner(self):
        self.repo.active = False
        self.repo.save()
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_inactive_repo_hidden_for_anonymous(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
        )
        self.assertEqual(response.status_code, 404)

    def test_inactive_repo_hidden_for_non_contributor(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_inactive_repo_hidden_for_jwt_non_contributor(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_org_repo_returns_200(self):
        org = m.Organization.objects.create(name="repoorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        response = self.client.get(
            f"/api/registry/model/repoorg/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["owner"], "repoorg")


class RepositoryPermissionsTest(RegistryAPIComprehensiveTestCase):
    def test_owner_has_permissions(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/permissions/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_owner"])
        self.assertTrue(data["can_manage"])

    def test_superuser_has_permissions(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/permissions/",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["can_manage"])

    def test_no_permissions_for_stranger(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/permissions/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["is_owner"])
        self.assertFalse(response.json()["can_manage"])

    def test_contributor_admin_has_permissions(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/permissions/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["can_manage"])

    def test_org_member_owner_has_permissions(self):
        org = m.Organization.objects.create(name="permorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.OWNER,
        )
        response = self.client.get(
            f"/api/registry/model/permorg/{self.repo.name}/permissions/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_owner"])
        self.assertTrue(data["can_manage"])

    def test_org_member_contributor_no_permissions(self):
        org = m.Organization.objects.create(name="permorg2")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        response = self.client.get(
            f"/api/registry/model/permorg2/{self.repo.name}/permissions/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_owner"])
        self.assertFalse(data["can_manage"])

    def test_not_found(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/nonexistent/permissions/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)


class UpdateModelDescriptionTest(RegistryAPIComprehensiveTestCase):
    def test_owner_can_update(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/description/",
            data=json.dumps({"description": "New description"}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.model.refresh_from_db()
        self.assertEqual(self.model.description, "New description")

    def test_contributor_can_update(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/description/",
            data=json.dumps({"description": "Contrib update"}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_superuser_can_update(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/description/",
            data=json.dumps({"description": "Super update"}),
            content_type="application/json",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_no_permission(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/description/",
            data=json.dumps({"description": "Fail"}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_not_found(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/nonexistent/description/",
            data=json.dumps({"description": "Fail"}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)


class UpdatePredictionPublishedJWTTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        self.prediction = self._create_prediction()

    def test_owner_can_update(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/published/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.prediction.refresh_from_db()
        self.assertFalse(self.prediction.published)

    def test_no_permission(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/published/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_not_found(self):
        response = self.client.patch(
            "/api/registry/prediction/99999/published/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)


class ModelUpdateTest(RegistryAPIComprehensiveTestCase):
    def test_owner_can_update(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            data=json.dumps({"active": False, "description": "Updated"}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.repo.refresh_from_db()
        self.assertFalse(self.repo.active)
        self.model.refresh_from_db()
        self.assertEqual(self.model.description, "Updated")

    def test_superuser_can_update(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            data=json.dumps({"active": True}),
            content_type="application/json",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_no_permission(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            data=json.dumps({"active": False}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_contributor_admin_can_update(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            data=json.dumps({"description": "Contrib desc"}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_org_owner_can_update(self):
        org = m.Organization.objects.create(name="testorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.OWNER,
        )
        response = self.client.patch(
            f"/api/registry/model/testorg/{self.repo.name}/",
            data=json.dumps({"description": "Org owner"}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_org_contributor_cannot_update(self):
        org = m.Organization.objects.create(name="testorg2")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        response = self.client.patch(
            f"/api/registry/model/testorg2/{self.repo.name}/",
            data=json.dumps({"description": "Org contributor"}),
            content_type="application/json",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_not_found(self):
        response = self.client.patch(
            f"/api/registry/model/{self.user.username}/nonexistent/",
            data=json.dumps({"active": False}),
            content_type="application/json",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)


class ModelDeleteTest(RegistryAPIComprehensiveTestCase):
    def test_owner_can_delete(self):
        response = self.client.delete(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(m.Repository.objects.filter(pk=self.repo.pk).exists())

    def test_no_permission(self):
        response = self.client.delete(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_superuser_can_delete(self):
        response = self.client.delete(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.super_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_not_found(self):
        response = self.client.delete(
            f"/api/registry/model/{self.user.username}/nonexistent/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_contributor_admin_can_delete(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        response = self.client.delete(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_org_admin_can_delete(self):
        org = m.Organization.objects.create(name="delorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.MAINTAINER,
        )
        response = self.client.delete(
            f"/api/registry/model/delorg/{self.repo.name}/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_org_contributor_cannot_delete(self):
        org = m.Organization.objects.create(name="delorg2")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        response = self.client.delete(
            f"/api/registry/model/delorg2/{self.repo.name}/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)


class ListModelsAuthTest(RegistryAPIComprehensiveTestCase):
    def test_super_user_sees_all(self):
        response = self.client.get(
            "/api/registry/models/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_regular_user_sees_only_active(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            "/api/registry/models/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for item in data["items"]:
            self.assertTrue(item["active"])


class ListPredictionsAuthTest(RegistryAPIComprehensiveTestCase):
    def test_super_user_sees_all(self):
        self._create_prediction(published=False)
        response = self.client.get(
            "/api/registry/predictions/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_regular_user_sees_only_published(self):
        self._create_prediction(published=False)
        self._create_prediction(published=True)
        response = self.client.get(
            "/api/registry/predictions/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for item in data["items"]:
            self.assertTrue(item["published"])

    def test_contributor_sees_unpublished_own(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        self._create_prediction(published=False)
        response = self.client.get(
            "/api/registry/predictions/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_base_prediction_without_rows(self):
        m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="d" * 40,
            description="Base prediction",
            published=True,
        )
        response = self.client.get(
            "/api/registry/predictions/?disease=A90",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)


class CreatePredictionComprehensiveTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )

    def _base_payload(self, **overrides):
        payload = {
            "repository": f"{self.user.username}/{self.repo.name}",
            "disease": "A90",
            "description": "Test",
            "commit": "a" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "prediction": [
                {
                    "date": (
                        date(2024, 1, 7) + timedelta(weeks=i)
                    ).isoformat(),
                    "pred": 100.0 + i,
                    "lower_95": 0.0,
                    "lower_90": 80.0 + i,
                    "lower_80": 85.0,
                    "lower_50": 90.0,
                    "upper_50": 110.0,
                    "upper_80": 115.0,
                    "upper_90": 120.0 + i,
                    "upper_95": 200.0,
                }
                for i in range(4)
            ],
        }
        payload.update(overrides)
        return payload

    def test_create_prediction_sprint_with_reported_rejected(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.model.save()
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload(case_definition="reported")),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_sprint_full_range(self):
        from epiweeks import Week

        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.model.save()

        start = Week(2023, 41).startdate()
        end = Week(2024, 40).startdate()
        payload = {
            "repository": f"{self.user.username}/{self.repo.name}",
            "disease": "A90",
            "description": "Sprint",
            "commit": "e" * 40,
            "case_definition": "probable",
            "published": True,
            "adm_level": 0,
            "adm_0": "BRA",
            "prediction": [],
        }
        d = start
        while d <= end:
            payload["prediction"].append(
                {
                    "date": d.isoformat(),
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
            )
            d += timedelta(weeks=1)

        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_org_admin_permission(self):
        org = m.Organization.objects.create(name="testorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.MAINTAINER,
        )
        payload = self._base_payload(repository=f"testorg/{self.repo.name}")
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_adm_1_not_found(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload(adm_level=1, adm_1="99")),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_adm_0_not_found(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload(adm_0="ZZZ")),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_adm_3_success(self):
        adm1, _ = Adm1.objects.get_or_create(
            geocode="33",
            defaults={"name": "RJ", "country": self.adm0},
        )
        adm2, _ = Adm2.objects.get_or_create(
            geocode="3304557",
            defaults={"name": "RJ City", "adm1": adm1},
        )
        Adm3.objects.get_or_create(
            geocode="330455701",
            defaults={"name": "RJ Sub", "adm2": adm2},
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(
                self._base_payload(
                    adm_level=3,
                    adm_1="33",
                    adm_2="3304557",
                    adm_3="330455701",
                )
            ),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_invalid_date(self):
        payload = self._base_payload()
        payload["prediction"][0]["date"] = "2024-01-08"
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_missing_adm_0(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload(adm_0="")),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_missing_adm_2(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(
                self._base_payload(adm_level=2, adm_1="33", adm_2=None)
            ),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_missing_adm_3(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(
                self._base_payload(
                    adm_level=3, adm_1="33", adm_2="3304557", adm_3=None
                )
            ),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_duplicate_dates(self):
        payload = self._base_payload()
        payload["prediction"][1] = dict(payload["prediction"][0])
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_prediction_org_contributor_no_permission(self):
        org = m.Organization.objects.create(name="testorg3")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        payload = self._base_payload(repository=f"testorg3/{self.repo.name}")
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_create_prediction_adm_3_not_found(self):
        adm1, _ = Adm1.objects.get_or_create(
            geocode="33",
            defaults={"name": "RJ", "country": self.adm0},
        )
        adm2, _ = Adm2.objects.get_or_create(
            geocode="3304557",
            defaults={"name": "RJ City", "adm1": adm1},
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(
                self._base_payload(
                    adm_level=3,
                    adm_1="33",
                    adm_2="3304557",
                    adm_3="99999",
                )
            ),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_duplicate_prediction_detected(self):
        response1 = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload()),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response1.status_code, 201)
        response2 = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload(commit="b" * 40)),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response2.status_code, 422)

    def test_create_prediction_different_values_ok(self):
        response1 = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload()),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response1.status_code, 201)
        payload = self._base_payload(commit="c" * 40)
        payload["prediction"] = [
            {**row, "pred": 101.0 + i}
            for i, row in enumerate(payload["prediction"])
        ]
        response2 = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response2.status_code, 201)

    def test_create_prediction_write_contributor_not_owner(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        payload = self._base_payload(
            repository=f"{self.user.username}/{self.repo.name}"
        )
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_create_prediction_via_swagger(self):
        response = self.client.post(
            "/api/registry/predictions/",
            data=json.dumps(self._base_payload()),
            content_type="application/json",
            HTTP_REFERER="http://testserver/api/docs",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["id"], 0)


class GetPredictionAuthTest(RegistryAPIComprehensiveTestCase):
    def test_super_user_sees_unpublished(self):
        pred = self._create_prediction(published=False)
        response = self.client.get(
            f"/api/registry/predictions/{pred.id}/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_regular_user_cannot_see_unpublished(self):
        pred = self._create_prediction(published=False)
        response = self.client.get(
            f"/api/registry/predictions/{pred.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)


class GetPredictionDataAuthTest(RegistryAPIComprehensiveTestCase):
    def test_super_user_sees_unpublished_data(self):
        pred = self._create_prediction(published=False)
        response = self.client.get(
            f"/api/registry/predictions/{pred.id}/data/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_regular_user_cannot_see_unpublished_data(self):
        pred = self._create_prediction(published=False)
        response = self.client.get(
            f"/api/registry/predictions/{pred.id}/data/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)


class DeletePredictionComprehensiveTest(RegistryAPIComprehensiveTestCase):
    def test_org_admin_can_delete(self):
        org = m.Organization.objects.create(name="delorg2")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.OWNER,
        )
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_org_contributor_cannot_delete(self):
        org = m.Organization.objects.create(name="delorg3")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_contributor_write_can_delete(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_contributor_admin_can_delete(self):
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_super_user_can_delete(self):
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_requires_auth(self):
        pred = self._create_prediction()
        response = self.client.delete(
            f"/api/registry/predictions/{pred.id}/",
        )
        self.assertEqual(response.status_code, 401)


class PredictionPublishedUidKeyTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        self.prediction = self._create_prediction()

    def test_owner_can_publish(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)

    def test_no_permission(self):
        response = self.client.patch(
            f"/api/registry/prediction/{self.prediction.id}/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_not_found(self):
        response = self.client.patch(
            "/api/registry/prediction/99999/publish/",
            data=json.dumps({"published": False}),
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)


class RepositoryReadmeTest(RegistryAPIComprehensiveTestCase):
    @patch("registry.api.GithubProvider")
    def test_readme_oauth_account_returns_content(self, MockProvider):
        mock_provider = MagicMock()
        mock_provider.get_readme.return_value = "# README"
        MockProvider.return_value = mock_provider

        from users.models import OAuthAccount

        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="token",
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 200)

    def test_not_found(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/nonexistent/readme/",
        )
        self.assertEqual(response.status_code, 404)

    @patch("registry.api.httpx.Client")
    @patch("registry.api.GithubProvider")
    def test_readme_provider_exception(self, MockProvider, MockClient):
        mock_provider = MagicMock()
        mock_provider.get_readme.side_effect = Exception("fail")
        MockProvider.return_value = mock_provider

        mock_resp = MagicMock()
        mock_resp.status_code = 404
        MockClient.return_value.__enter__ = lambda s: s
        MockClient.return_value.__exit__ = MagicMock(return_value=False)
        MockClient.return_value.get.return_value = mock_resp

        from users.models import OAuthAccount

        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="123",
            raw_info={},
            access_token="token",
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 404)

    def test_readme_no_owner_no_admin(self):
        org = m.Organization.objects.create(name="noown")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        response = self.client.get(
            f"/api/registry/model/noown/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 404)

    def test_readme_unsupported_provider(self):
        self.repo.provider = "bitbucket"
        self.repo.save()
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 404)

    @patch("registry.api.httpx.Client")
    def test_readme_admin_contributor_api_fallback(self, MockClient):
        from users.models import OAuthAccount

        org = m.Organization.objects.create(name="admorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="456",
            raw_info={},
            access_token="token",
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "README from API"
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.get(
            f"/api/registry/model/admorg/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 200)

    @patch("registry.api.httpx.Client")
    def test_readme_raw_fallback(self, MockClient):
        resp_404 = MagicMock()
        resp_404.status_code = 404
        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.text = "README from raw"
        mock_client = MagicMock()
        mock_client.get.side_effect = [resp_404, resp_200]
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 200)

    @patch("registry.api.httpx.Client")
    @patch("registry.api.GithubProvider")
    def test_readme_expired_token_refreshes(self, MockProvider, MockClient):
        from users.models import OAuthAccount

        from django.utils import timezone

        mock_provider = MagicMock()
        mock_provider.get_readme.return_value = "# README refreshed"
        mock_provider.refresh_access_token.return_value = {
            "access_token": "new-token",
            "refresh_token": "new-refresh",
            "expires_in": 3600,
        }
        MockProvider.return_value = mock_provider

        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="789",
            raw_info={},
            access_token="old-token",
            refresh_token="old-refresh",
            access_token_expires_at=timezone.now() - timedelta(minutes=30),
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 200)
        account = OAuthAccount.objects.get(provider_id="789")
        self.assertEqual(account.access_token, "new-token")

    @patch("registry.api.GithubProvider")
    def test_readme_expired_token_no_expires_in(self, MockProvider):
        from users.models import OAuthAccount

        from django.utils import timezone

        mock_provider = MagicMock()
        mock_provider.get_readme.return_value = "# README refreshed"
        mock_provider.refresh_access_token.return_value = {
            "access_token": "new-token-no-expires"
        }
        MockProvider.return_value = mock_provider

        OAuthAccount.objects.create(
            user=self.user,
            provider="github",
            provider_id="791",
            raw_info={},
            access_token="old-token",
            refresh_token="old-refresh",
            access_token_expires_at=timezone.now() - timedelta(minutes=30),
        )
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 200)

    @patch("registry.api.httpx.Client")
    def test_readme_fallback_exceptions(self, MockClient):
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("network down")
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.get(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/readme/",
        )
        self.assertEqual(response.status_code, 404)


class GetModelAuthTest(RegistryAPIComprehensiveTestCase):
    def test_super_user_sees_inactive_repo(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.super_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_contributor_sees_inactive_repo(self):
        self.repo.active = False
        self.repo.save()
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.WRITE,
        )
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_anonymous_cannot_see_inactive_repo(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
        )
        self.assertEqual(response.status_code, 401)

    def test_regular_user_cannot_see_inactive_repo(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)


class ModelRefreshAvatarTest(RegistryAPIComprehensiveTestCase):
    def setUp(self):
        super().setUp()
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )

    @patch("registry.api.httpx.Client")
    def test_owner_can_refresh_github(self, MockClient):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "avatar_url": "https://example.com/av.png"
        }
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    @patch("registry.api.httpx.Client")
    def test_owner_can_refresh_gitlab(self, MockClient):
        repo = m.Repository.objects.create(
            repo_id="66666",
            name="gitlab-repo",
            provider="gitlab",
            owner=self.user,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "avatar_url": "https://gitlab.com/av.png"
        }
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/gitlab-repo/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    @patch("registry.api.httpx.Client")
    def test_org_owner_can_refresh(self, MockClient):
        org = m.Organization.objects.create(name="avorg")
        self.repo.owner = None
        self.repo.organization = org
        self.repo.save()
        m.RepositoryContributor.objects.create(
            user=self.other_user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        m.OrganizationMembership.objects.create(
            user=self.other_user,
            organization=org,
            role=m.OrganizationMembership.Roles.OWNER,
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "avatar_url": "https://example.com/av.png"
        }
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/avorg/{self.repo.name}/refresh-avatar/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_not_found(self):
        response = self.client.post(
            f"/api/registry/model/{self.user.username}/nonexistent/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_no_permission(self):
        other_repo = m.Repository.objects.create(
            repo_id="77777",
            name="other-repo",
            provider="github",
            owner=self.other_user,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=other_repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        response = self.client.post(
            f"/api/registry/model/{self.other_user.username}/other-repo/refresh-avatar/",
            **self.other_jwt_headers,
        )
        self.assertEqual(response.status_code, 403)

    @patch("registry.api.httpx.Client")
    def test_provider_api_returns_400(self, MockClient):
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 400)

    @patch("registry.api.httpx.Client")
    def test_gitlab_provider_returns_400(self, MockClient):
        repo = m.Repository.objects.create(
            repo_id="88888",
            name="gitlab-repo404",
            provider="gitlab",
            owner=self.user,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/gitlab-repo404/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 400)

    @patch("registry.api.httpx.Client")
    def test_unsupported_provider_returns_400(self, MockClient):
        repo = m.Repository.objects.create(
            repo_id="99999",
            name="bitbucket-repo",
            provider="bitbucket",
            owner=self.user,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        m.RepositoryContributor.objects.create(
            user=self.user,
            repository=repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/bitbucket-repo/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 400)

    @patch("registry.api.httpx.Client")
    def test_provider_api_timeout(self, MockClient):
        import httpx

        mock_client = MagicMock()
        mock_client.get.side_effect = httpx.TimeoutException("timeout")
        mock_client.__enter__ = lambda s: s
        mock_client.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client

        response = self.client.post(
            f"/api/registry/model/{self.user.username}/{self.repo.name}/refresh-avatar/",
            **self.jwt_headers,
        )
        self.assertEqual(response.status_code, 400)


class GetModelPublicTest(RegistryAPIComprehensiveTestCase):
    def test_public_returns_200(self):
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_inactive_repo_invisible_public(self):
        self.repo.active = False
        self.repo.save()
        response = self.client.get(
            f"/api/registry/models/{self.user.username}/{self.repo.name}/",
            **self.other_headers,
        )
        self.assertEqual(response.status_code, 404)


class RepositoryPredictionsTest(RegistryAPIComprehensiveTestCase):
    def test_not_found(self):
        response = self.client.get(
            f"/api/registry/model/{self.user.username}/nonexistent/predictions/",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 404)
