from io import StringIO
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from registry import models as m

User = get_user_model()


class RefreshAvatarsCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="avataruser",
            email="avatar@test.com",
            password="testpass",
            is_active=True,
        )
        self.org = m.Organization.objects.create(name="avatarorg")
        self.repo = m.Repository.objects.create(
            repo_id="11111",
            name="avatar-repo",
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

    def test_updates_github_owner_avatar(self):
        with patch(
            "registry.management.commands.refresh_avatars.httpx.Client"
        ) as MockClient:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "avatar_url": "https://example.com/av.png"
            }
            mock_client.get.return_value = mock_resp
            MockClient.return_value.__enter__ = lambda s: s
            MockClient.return_value.__exit__ = MagicMock(return_value=False)
            MockClient.return_value.get.return_value = mock_resp

            out = StringIO()
            call_command("refresh_avatars", stdout=out)
            self.user.refresh_from_db()
            self.assertEqual(
                self.user.avatar_url, "https://example.com/av.png"
            )
            self.assertIn(
                "Finished. Successfully synced 1 profiles.", out.getvalue()
            )

    def test_handles_connection_exception(self):
        with patch(
            "registry.management.commands.refresh_avatars.httpx.Client"
        ) as MockClient:
            mock_client = MagicMock()
            mock_client.get.side_effect = Exception("boom")
            mock_client.__enter__ = lambda s: s
            mock_client.__exit__ = MagicMock(return_value=False)
            MockClient.return_value = mock_client

            out = StringIO()
            call_command("refresh_avatars", stdout=out)
            self.assertIn("Connection failed", out.getvalue())
            self.assertIn("Successfully synced 0 profiles.", out.getvalue())

    def test_could_not_resolve_avatar(self):
        with patch(
            "registry.management.commands.refresh_avatars.httpx.Client"
        ) as MockClient:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 404
            mock_client.get.return_value = mock_resp
            MockClient.return_value.__enter__ = lambda s: s
            MockClient.return_value.__exit__ = MagicMock(return_value=False)
            MockClient.return_value.get.return_value = mock_resp

            out = StringIO()
            call_command("refresh_avatars", stdout=out)
            self.assertIn("Could not resolve avatar", out.getvalue())
            self.assertIn("Successfully synced 0 profiles.", out.getvalue())

    def test_updates_gitlab_org_avatar(self):
        self.repo.delete()
        self.org = m.Organization.objects.create(name="avatarorg2")
        repo = m.Repository.objects.create(
            repo_id="22222",
            name="avatar-repo2",
            provider="gitlab",
            owner=None,
            organization=self.org,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        with patch(
            "registry.management.commands.refresh_avatars.httpx.Client"
        ) as MockClient:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "avatar_url": "https://gitlab.com/av.png"
            }
            mock_client.get.return_value = mock_resp
            MockClient.return_value.__enter__ = lambda s: s
            MockClient.return_value.__exit__ = MagicMock(return_value=False)
            MockClient.return_value.get.return_value = mock_resp

            out = StringIO()
            call_command("refresh_avatars", stdout=out)
            self.org.refresh_from_db()
            self.assertEqual(self.org.avatar_url, "https://gitlab.com/av.png")
            self.assertIn("Successfully synced 1 profiles.", out.getvalue())

    def test_gitlab_404_no_avatar(self):
        self.repo.delete()
        org = m.Organization.objects.create(name="avatarorg3")
        repo = m.Repository.objects.create(
            repo_id="33333",
            name="avatar-repo3",
            provider="gitlab",
            owner=None,
            organization=org,
            active=True,
        )
        m.RepositoryModel.objects.create(
            repository=repo,
            description="A test model",
            category=m.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=m.RepositoryModel.Periodicity.WEEK,
        )
        with patch(
            "registry.management.commands.refresh_avatars.httpx.Client"
        ) as MockClient:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 404
            mock_client.get.return_value = mock_resp
            MockClient.return_value.__enter__ = lambda s: s
            MockClient.return_value.__exit__ = MagicMock(return_value=False)
            MockClient.return_value.get.return_value = mock_resp

            out = StringIO()
            call_command("refresh_avatars", stdout=out)
            self.assertIn("Could not resolve avatar", out.getvalue())
            self.assertIn("Successfully synced 0 profiles.", out.getvalue())

    def test_unsupported_provider_no_resolution(self):
        self.repo.delete()
        repo = m.Repository.objects.create(
            repo_id="44444",
            name="avatar-repo4",
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
        out = StringIO()
        call_command("refresh_avatars", stdout=out)
        self.assertIn("Could not resolve avatar", out.getvalue())
        self.assertIn("Successfully synced 0 profiles.", out.getvalue())
