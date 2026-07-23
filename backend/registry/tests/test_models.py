from datetime import date

from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

from registry import models as m
from datastore.models import ICD, Disease, Adm0, Adm1, Adm2

User = get_user_model()


class SprintModelTest(TestCase):
    def setUp(self):
        self.sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.sprint2 = m.Sprint.objects.create(
            year=2023,
            start_date=date(2023, 10, 1),
            end_date=date(2024, 5, 31),
        )

    def test_sprint_creation(self):
        self.assertEqual(self.sprint.year, 2024)
        self.assertEqual(str(self.sprint), "Sprint 2024")

    def test_sprint_ordering(self):
        sprints = list(m.Sprint.objects.all())
        ordered = sorted(sprints, key=lambda s: s.start_date, reverse=True)
        self.assertEqual(
            [s.year for s in sprints],
            [s.year for s in ordered],
        )


class OrganizationModelTest(TestCase):
    def setUp(self):
        self.org = m.Organization.objects.create(name="testorg")

    def test_organization_creation(self):
        self.assertEqual(self.org.name, "testorg")
        self.assertIsNotNone(self.org.created)
        self.assertIsNotNone(self.org.updated)

    def test_organization_unique_name(self):
        with self.assertRaises(IntegrityError):
            m.Organization.objects.create(name="testorg")

    def test_get_avatar_returns_none_when_no_avatar(self):
        self.assertIsNone(self.org.get_avatar())


class OrganizationMembershipTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.org = m.Organization.objects.create(name="testorg")
        self.membership = m.OrganizationMembership.objects.create(
            user=self.user,
            organization=self.org,
            role=m.OrganizationMembership.Roles.OWNER,
        )

    def test_membership_creation(self):
        self.assertEqual(self.membership.role, "owner")
        self.assertEqual(self.membership.user, self.user)
        self.assertEqual(self.membership.organization, self.org)

    def test_membership_unique_together(self):
        with self.assertRaises(IntegrityError):
            m.OrganizationMembership.objects.create(
                user=self.user,
                organization=self.org,
                role=m.OrganizationMembership.Roles.CONTRIBUTOR,
            )

    def test_roles_enum(self):
        self.assertIn("owner", m.OrganizationMembership.Roles.values)
        self.assertIn("maintainer", m.OrganizationMembership.Roles.values)
        self.assertIn("contributor", m.OrganizationMembership.Roles.values)


class RepositoryTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.org = m.Organization.objects.create(name="testorg")

    def test_repository_creation_with_owner(self):
        repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
        )
        self.assertEqual(repo.name, "test-repo")
        self.assertEqual(repo.provider, "github")
        self.assertEqual(repo.owner, self.user)
        self.assertEqual(str(repo), "testuser/test-repo (github)")

    def test_repository_creation_with_organization(self):
        repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="gitlab",
            organization=self.org,
        )
        self.assertEqual(repo.organization, self.org)
        self.assertEqual(str(repo), "testorg/test-repo (gitlab)")

    def test_repository_unique_repo_id_per_provider(self):
        m.Repository.objects.create(
            repo_id="12345",
            name="repo1",
            provider="github",
            owner=self.user,
        )
        with self.assertRaises(IntegrityError):
            m.Repository.objects.create(
                repo_id="12345",
                name="repo2",
                provider="github",
                organization=self.org,
            )

    def test_repository_must_have_owner_or_org(self):
        repo = m.Repository(
            repo_id="12345",
            name="test-repo",
            provider="github",
        )
        with self.assertRaises(IntegrityError):
            repo.save()

    def test_repository_cannot_have_both_owner_and_org(self):
        repo = m.Repository(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
            organization=self.org,
        )
        with self.assertRaises(IntegrityError):
            repo.save()

    def test_repository_avatar_url_from_owner(self):
        repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
        )
        self.assertEqual(repo.avatar_url, self.user.get_avatar())

    def test_repository_avatar_url_from_organization(self):
        repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            organization=self.org,
        )
        self.assertEqual(repo.avatar_url, self.org.get_avatar())


class RepositoryContributorTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
        )
        self.contributor = m.RepositoryContributor.objects.create(
            user=self.user,
            repository=self.repo,
            permission=m.RepositoryContributor.Permissions.ADMIN,
        )

    def test_contributor_creation(self):
        self.assertEqual(self.contributor.permission, "admin")
        self.assertEqual(self.contributor.user, self.user)

    def test_contributor_unique_together(self):
        with self.assertRaises(IntegrityError):
            m.RepositoryContributor.objects.create(
                user=self.user,
                repository=self.repo,
                permission=m.RepositoryContributor.Permissions.WRITE,
            )


class RepositoryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
        )
        self.model = m.RepositoryModel.objects.create(
            repository=self.repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )

    def test_repository_model_creation(self):
        self.assertEqual(self.model.repository, self.repo)
        self.assertEqual(self.model.description, "A test model")
        self.assertEqual(self.model.category, "quantitative")
        self.assertEqual(self.model.time_resolution, "week")
        self.assertIn("test-repo", str(self.model))

    def test_repository_model_one_to_one(self):
        with self.assertRaises(IntegrityError):
            m.RepositoryModel.objects.create(
                repository=self.repo,
                category=m.RepositoryModel.Category.CATEGORICAL,
                time_resolution=m.RepositoryModel.Periodicity.DAY,
            )

    def test_repository_model_with_sprint(self):
        sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )
        self.model.sprint = sprint
        self.model.save()
        self.model.refresh_from_db()
        self.assertEqual(self.model.sprint.year, 2024)

    def test_category_choices(self):
        choices = set(m.RepositoryModel.Category.values)
        self.assertIn("quantitative", choices)
        self.assertIn("categorical", choices)
        self.assertIn("spatial_quantitative", choices)
        self.assertIn("spatial_categorical", choices)
        self.assertIn("spatio_temporal_quantitative", choices)
        self.assertIn("spatio_temporal_categorical", choices)

    def test_periodicity_choices(self):
        choices = set(m.RepositoryModel.Periodicity.values)
        self.assertIn("day", choices)
        self.assertIn("week", choices)
        self.assertIn("month", choices)
        self.assertIn("year", choices)

    def test_category_meta(self):
        meta = m.RepositoryModel.Category.QUANTITATIVE.meta
        self.assertIn("domain", meta)
        self.assertIn("output", meta)
        self.assertIn("example", meta)


class ModelPredictionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
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
            defaults={"name": "Dengue"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )

    def test_prediction_with_adm_level_1(self):
        prediction = m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="a" * 40,
        )
        self.assertEqual(prediction.adm_level, 0)
        self.assertTrue(prediction.published)
        self.assertEqual(prediction.commit, "a" * 40)

    def test_prediction_with_adm_level_2(self):
        adm1, _ = Adm1.objects.get_or_create(
            geocode="33",
            defaults={"name": "Rio de Janeiro", "country": self.adm0},
        )
        adm2, _ = Adm2.objects.get_or_create(
            geocode="3304557",
            defaults={"name": "Rio de Janeiro", "adm1": adm1},
        )
        prediction = m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=2,
            adm0=self.adm0,
            adm1=adm1,
            adm2=adm2,
            commit="b" * 40,
            description="Test prediction",
        )
        self.assertEqual(prediction.adm_level, 2)

    def test_prediction_case_definition_default(self):
        prediction = m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="c" * 40,
        )
        self.assertEqual(prediction.case_definition, "reported")

    def test_prediction_published_default(self):
        prediction = m.ModelPrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="d" * 40,
        )
        self.assertTrue(prediction.published)


class QuantitativePredictionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
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
            defaults={"name": "Dengue"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )

    def test_quantitative_prediction_creation(self):
        prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="e" * 40,
        )
        self.assertIsNone(prediction.mae_score)

    def test_scores_property_returns_none_when_no_scores(self):
        prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="f" * 40,
        )
        scores = prediction.scores
        self.assertIsNone(scores["mae"])
        self.assertIsNone(scores["mse"])
        self.assertIsNone(scores["crps"])
        self.assertIsNone(scores["log_score"])
        self.assertIsNone(scores["interval_score"])
        self.assertIsNone(scores["wis"])

    def test_scores_property_with_scores(self):
        prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="g" * 40,
            mae_score=1.234,
            mse_score=5.678,
            crps_score=3.456,
            log_score=2.345,
            interval_score=4.567,
            wis_score=6.789,
        )
        scores = prediction.scores
        self.assertEqual(scores["mae"], 1.23)
        self.assertEqual(scores["mse"], 5.68)
        self.assertEqual(scores["crps"], 3.46)
        self.assertEqual(scores["log_score"], 2.35)
        self.assertEqual(scores["interval_score"], 4.57)
        self.assertEqual(scores["wis"], 6.79)


class QuantitativePredictionRowTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
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
            defaults={"name": "Dengue"},
        )
        self.adm0, _ = Adm0.objects.get_or_create(
            geocode="BRA",
            defaults={"name": "Brazil"},
        )
        self.prediction = m.QuantitativePrediction.objects.create(
            model=self.model,
            disease=self.disease,
            adm_level=0,
            adm0=self.adm0,
            commit="h" * 40,
        )

    def test_row_creation(self):
        row = m.QuantitativePredictionRow.objects.create(
            prediction=self.prediction,
            date=date(2024, 1, 7),
            pred=100.0,
            lower_90=80.0,
            upper_90=120.0,
        )
        self.assertEqual(row.pred, 100.0)
        self.assertEqual(row.lower_90, 80.0)
        self.assertEqual(row.upper_90, 120.0)
        self.assertIsNone(row.lower_95)
        self.assertIsNone(row.upper_95)

    def test_row_ordering(self):
        m.QuantitativePredictionRow.objects.create(
            prediction=self.prediction,
            date=date(2024, 1, 14),
            pred=200.0,
            lower_90=180.0,
            upper_90=220.0,
        )
        m.QuantitativePredictionRow.objects.create(
            prediction=self.prediction,
            date=date(2024, 1, 7),
            pred=100.0,
            lower_90=80.0,
            upper_90=120.0,
        )
        rows = list(self.prediction.data.all())
        self.assertEqual(rows[0].date, date(2024, 1, 7))
        self.assertEqual(rows[1].date, date(2024, 1, 14))


class PublicationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
        )
        self.repo = m.Repository.objects.create(
            repo_id="12345",
            name="test-repo",
            provider="github",
            owner=self.user,
        )
        self.model = m.RepositoryModel.objects.create(
            repository=self.repo,
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        self.sprint = m.Sprint.objects.create(
            year=2024,
            start_date=date(2024, 10, 1),
            end_date=date(2025, 5, 31),
        )

    def test_publication_creation(self):
        pub = m.Publication.objects.create(
            title="Test Publication",
            authors_list="Author, A.; Author, B.",
            publication_type=m.Publication.Type.JOURNAL,
            year=2024,
            venue="Test Journal",
            doi="10.1234/test",
        )
        pub.related_models.add(self.model)
        pub.related_sprints.add(self.sprint)

        self.assertEqual(pub.title, "Test Publication")
        self.assertEqual(pub.publication_type, "journal")
        self.assertEqual(pub.year, 2024)
        self.assertEqual(str(pub), "Test Publication (2024)")
        self.assertIn(self.model, pub.related_models.all())
        self.assertIn(self.sprint, pub.related_sprints.all())

    def test_publication_citation_preview(self):
        pub = m.Publication.objects.create(
            title="Test Publication",
            authors_list="Author, A.",
            publication_type=m.Publication.Type.JOURNAL,
            year=2024,
            venue="Test Journal",
        )
        self.assertIn("Author, A. (2024)", pub.citation_preview)
        self.assertIn("Test Publication", pub.citation_preview)
        self.assertIn("Test Journal", pub.citation_preview)

    def test_publication_ordering(self):
        m.Publication.objects.create(
            title="A First",
            authors_list="A",
            publication_type=m.Publication.Type.JOURNAL,
            year=2024,
            date=date(2024, 6, 1),
        )
        m.Publication.objects.create(
            title="B Second",
            authors_list="B",
            publication_type=m.Publication.Type.JOURNAL,
            year=2023,
            date=date(2023, 12, 1),
        )
        pubs = list(m.Publication.objects.all())
        self.assertEqual(pubs[0].year, 2024)
        self.assertEqual(pubs[1].year, 2023)
