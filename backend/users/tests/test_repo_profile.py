import tempfile
from unittest.mock import MagicMock, patch

from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache

from users.jwt import create_access_token
from users.models import OAuthAccount
from users import api as users_api
from registry import models as rm

User = get_user_model()


def _httpx_err(status):
    import httpx

    resp = MagicMock(status_code=status)
    return httpx.HTTPStatusError("err", request=MagicMock(), response=resp)


class RepoProfileTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="repouser",
            email="repo@test.com",
            password="pass",
            first_name="Repo",
            last_name="User",
        )
        self.jwt = {
            "HTTP_AUTHORIZATION": "Bearer "
            + create_access_token({"sub": str(self.user.pk)})
        }

    def _add_github_account(self, **kw):
        defaults = {
            "provider": "github",
            "provider_id": "r1",
            "raw_info": {},
            "access_token": "at",
            "refresh_token": None,
            "access_token_expires_at": None,
        }
        defaults.update(kw)
        return OAuthAccount.objects.create(user=self.user, **defaults)

    def test_list_repositories_no_account_404(self):
        r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 404)

    def _repo(self, name, **kw):
        repo = {
            "id": "r1",
            "name": name,
            "url": f"http://h/{name}",
            "private": False,
            "provider": "github",
            "available": True,
        }
        repo.update(kw)
        return repo

    def test_list_repositories_ok(self):
        self._add_github_account()
        client = MagicMock()
        client.get_user_repos.return_value = [self._repo("repo1")]
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["name"], "repo1")

    def test_list_repositories_excludes_existing(self):
        self._add_github_account()
        rm.Repository.objects.create(
            repo_id="x1",
            name="existing",
            provider="github",
            owner=self.user,
            active=True,
        )
        client = MagicMock()
        client.get_user_repos.return_value = [self._repo("repouser/existing")]
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()[0]["available"])

    def test_list_repositories_401_no_refresh(self):
        self._add_github_account(refresh_token=None)
        client = MagicMock()
        client.get_user_repos.side_effect = _httpx_err(401)
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 401)

    def test_list_repositories_401_refresh_success(self):
        self._add_github_account(refresh_token="ref")
        client = MagicMock()
        client.get_user_repos.side_effect = [
            _httpx_err(401),
            _httpx_err(401),
            [],
        ]
        client.refresh_access_token.return_value = {
            "access_token": "new",
            "expires_in": 3600,
        }
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        acc = OAuthAccount.objects.get(provider="github")
        self.assertEqual(acc.access_token, "new")

    def test_list_repositories_401_refresh_returns_401(self):
        self._add_github_account(refresh_token="ref")
        client = MagicMock()
        client.get_user_repos.side_effect = _httpx_err(401)
        client.refresh_access_token.side_effect = RuntimeError("bad")
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 401)

    def test_list_repositories_retry_succeeds_without_refresh(self):
        self._add_github_account(refresh_token="ref")
        client = MagicMock()
        client.get_user_repos.side_effect = [
            _httpx_err(401),
            [self._repo("ok")],
        ]
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        acc = OAuthAccount.objects.get(provider="github")
        self.assertEqual(acc.access_token, "at")

    def test_list_repositories_non_401_re_raises(self):
        client = Client(raise_request_exception=False)
        self._add_github_account()
        mock_client = MagicMock()
        mock_client.get_user_repos.side_effect = _httpx_err(500)
        with patch(
            "users.api.OAuthProvider.from_request", return_value=mock_client
        ):
            r = client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 500)

    def test_profile_models_own_repo(self):
        repo = rm.Repository.objects.create(
            repo_id="m1",
            name="myrepo",
            provider="github",
            owner=self.user,
            active=True,
        )
        rm.RepositoryModel.objects.create(
            repository=repo,
            description="desc",
            category=rm.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=rm.RepositoryModel.Periodicity.WEEK,
        )
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data[0]["name"], "myrepo")
        self.assertTrue(data[0]["can_manage"])

    def test_list_repositories_401_refresh_no_expires_in(self):
        self._add_github_account(refresh_token="ref")
        client = MagicMock()
        client.get_user_repos.side_effect = [
            _httpx_err(401),
            _httpx_err(401),
            [],
        ]
        client.refresh_access_token.return_value = {"access_token": "new"}
        with patch(
            "users.api.OAuthProvider.from_request", return_value=client
        ):
            r = self.client.get("/api/user/repositories/github/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        acc = OAuthAccount.objects.get(provider="github")
        self.assertIsNone(acc.access_token_expires_at)

    def test_profile_models_no_manage(self):
        org = rm.Organization.objects.create(name="nomange")
        rm.OrganizationMembership.objects.create(
            user=self.user,
            organization=org,
            role=rm.OrganizationMembership.Roles.CONTRIBUTOR,
        )
        repo = rm.Repository.objects.create(
            repo_id="nm1",
            name="nmrepo",
            provider="github",
            owner=None,
            organization=org,
            active=True,
        )
        rm.RepositoryModel.objects.create(
            repository=repo,
            description="desc",
            category=rm.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=rm.RepositoryModel.Periodicity.WEEK,
        )
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()[0]["can_manage"])

    def test_profile_models_no_results(self):
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    def test_profile_models_org_maintainer(self):
        org = rm.Organization.objects.create(name="profileorg")
        rm.OrganizationMembership.objects.create(
            user=self.user,
            organization=org,
            role=rm.OrganizationMembership.Roles.MAINTAINER,
        )
        repo = rm.Repository.objects.create(
            repo_id="org1",
            name="orgrepo",
            provider="github",
            owner=None,
            organization=org,
            active=True,
        )
        rm.RepositoryModel.objects.create(
            repository=repo,
            description="desc",
            category=rm.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=rm.RepositoryModel.Periodicity.WEEK,
        )
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()[0]["can_manage"])

    def test_profile_models_contributor(self):
        repo = rm.Repository.objects.create(
            repo_id="c1",
            name="contribrepo",
            provider="github",
            owner=self.user,
            active=True,
        )
        other = User.objects.create_user(
            username="otherowner", email="oo@test.com", password="p"
        )
        repo.owner = other
        repo.save()
        rm.RepositoryContributor.objects.create(
            user=self.user,
            repository=repo,
            permission=rm.RepositoryContributor.Permissions.WRITE,
        )
        rm.RepositoryModel.objects.create(
            repository=repo,
            description="desc",
            category=rm.RepositoryModel.Category.QUANTITATIVE,
            time_resolution=rm.RepositoryModel.Periodicity.WEEK,
        )
        r = self.client.get("/api/user/profile/models/", **self.jwt)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()[0]["can_manage"])


class DownloadImageTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="dluser", email="dl@test.com", password="pass"
        )

    def test_no_url_returns(self):
        self.assertIsNone(users_api.download_image(self.user, None))

    def test_non_200_no_save(self):
        resp = MagicMock(status_code=404, content=b"")
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = resp
            users_api.download_image(self.user, "http://x/a.jpg")
        self.user.refresh_from_db()
        self.assertIsNone(self.user.avatar_url)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_success(self):
        resp = MagicMock(status_code=200, content=b"image")
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = resp
            users_api.download_image(self.user, "http://x/a.jpg")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.avatar_url)

    def test_exception_passes(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.side_effect = Exception
            users_api.download_image(self.user, "http://x/a.jpg")
        self.user.refresh_from_db()
        self.assertIsNone(self.user.avatar_url)

    def test_get_client_ip_forwarded(self):
        req = MagicMock()
        req.META = {"HTTP_X_FORWARDED_FOR": "1.2.3.4, 5.6.7.8"}
        self.assertEqual(users_api.get_client_ip(req), "1.2.3.4")

    def test_get_client_ip_remote(self):
        req = MagicMock()
        req.META = {"REMOTE_ADDR": "9.9.9.9"}
        self.assertEqual(users_api.get_client_ip(req), "9.9.9.9")
