import base64
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.core import signing
from django.utils import timezone

from users.providers import (
    OAuthProvider,
    GithubProvider,
    GitlabProvider,
    GoogleProvider,
)


def _mock_response(status_code=200, json_data=None, text=None):
    r = MagicMock()
    r.status_code = status_code
    r.json.return_value = json_data or {}
    r.text = text or ""
    r.raise_for_status = MagicMock()
    if status_code >= 400:
        r.raise_for_status.side_effect = __import__("httpx").HTTPStatusError(
            "err", request=MagicMock(), response=r
        )
    return r


class OAuthProviderBaseTest(SimpleTestCase):
    def setUp(self):
        self.req = MagicMock()
        self.req.META = {"REMOTE_ADDR": "1.2.3.4", "HTTP_USER_AGENT": "ua"}

    def test_from_request_unsupported(self):
        with self.assertRaises(ValueError):
            OAuthProvider.from_request(self.req, "nope")

    def test_from_request_success(self):
        with patch(
            "users.providers.GithubProvider.__init__", return_value=None
        ) as mi:
            OAuthProvider.from_request(self.req, "github")
            mi.assert_called_once()

    def test_base_get_token(self):
        p = GitlabProvider.__new__(GitlabProvider)
        p.client_id = "cid"
        p.client_secret = "secret"
        p.token_url = "https://gitlab.com/oauth/token"
        p.redirect_url = "http://x/cb"
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.post.return_value = (
                _mock_response(json_data={"access_token": "tok"})
            )
            data = p.get_token("code")
            self.assertEqual(data["access_token"], "tok")

    def test_state_roundtrip(self):
        with patch(
            "users.providers.GithubProvider.__abstractmethods__", set()
        ):
            p = GithubProvider(self.req, extra_state={"next": "/x"})
            state = p.state
            data = p.decode_state(state)
            self.assertEqual(data["next"], "/x")
            self.assertEqual(data["ip"], "1.2.3.4")

    def test_state_bad_signature(self):
        with self.assertRaises(signing.BadSignature):
            with patch(
                "users.providers.GithubProvider.__abstractmethods__", set()
            ):
                GithubProvider(self.req).decode_state("garbage")


class GithubProviderTest(SimpleTestCase):
    def setUp(self):
        self.req = MagicMock()
        self.req.META = {"REMOTE_ADDR": "1.2.3.4"}
        with patch("users.providers.settings") as ms:
            ms.BACKEND_URL = "http://backend"
            ms.GITHUB_CLIENT_ID = "cid"
            ms.GITHUB_SECRET = "secret"
            ms.GITHUB_APP = "myapp"
            ms.GITHUB_APP_ID = "appid"
            ms.GITHUB_PRIVATE_KEY = "privkey"
            self.p = GithubProvider(self.req)

    def test_get_auth_url(self):
        url = self.p.get_auth_url()
        self.assertIn("https://github.com/login/oauth/authorize", url)

    def test_get_user_info_with_email(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"email": "a@b.com", "id": 1})
            )
            data = self.p.get_user_info("tok", {})
            self.assertEqual(data["email"], "a@b.com")

    def test_get_user_info_fetches_emails(self):
        first = _mock_response(json_data={"login": "x"})
        second = _mock_response(
            json_data=[{"primary": True, "verified": True, "email": "p@b.com"}]
        )
        client = MagicMock()
        client.get.side_effect = [first, second]
        client.__enter__.return_value = client
        with patch("httpx.Client", return_value=client):
            data = self.p.get_user_info("tok", {})
            self.assertEqual(data["email"], "p@b.com")

    def test_get_user_info_email_first_available(self):
        first = _mock_response(json_data={"login": "x"})
        second = _mock_response(
            json_data=[
                {"primary": False, "verified": False, "email": "f@b.com"}
            ]
        )
        client = MagicMock()
        client.get.side_effect = [first, second]
        client.__enter__.return_value = client
        with patch("httpx.Client", return_value=client):
            data = self.p.get_user_info("tok", {})
            self.assertEqual(data["email"], "f@b.com")

    def test_get_user_info_email_fetch_non_200(self):
        first = _mock_response(json_data={"login": "x"})
        second = _mock_response(status_code=403)
        client = MagicMock()
        client.get.side_effect = [first, second]
        client.__enter__.return_value = client
        with patch("httpx.Client", return_value=client):
            data = self.p.get_user_info("tok", {})
            self.assertNotIn("email", data)

    def test_has_installations_true(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"installations": [{"id": 1}]})
            )
            self.assertTrue(self.p.has_installations("tok"))

    def test_has_installations_false(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"installations": []})
            )
            self.assertFalse(self.p.has_installations("tok"))

    def test_has_installations_non_200(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(status_code=403)
            )
            self.assertFalse(self.p.has_installations("tok"))

    @patch("users.providers.jwt.encode", return_value="enc.jwt")
    def test_get_installation_token(self, _jwt):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.post.return_value = (
                _mock_response(json_data={"token": "t", "expires_at": "e"})
            )
            data = self.p.get_installation_token("123")
            self.assertEqual(data["token"], "t")

    def test_get_user_repos(self):
        inst = _mock_response(json_data={"installations": [{"id": "i1"}]})
        repos = _mock_response(
            json_data={
                "repositories": [
                    {
                        "id": "r1",
                        "name": "repo",
                        "owner": {"login": "me", "avatar_url": "http://a"},
                        "html_url": "http://h/repo/",
                        "private": False,
                        "permissions": {"admin": True},
                    },
                    {
                        "id": "r2",
                        "name": "nope",
                        "owner": {"login": "me", "avatar_url": "http://a"},
                        "html_url": "http://h/nope",
                        "private": True,
                        "permissions": {"admin": False},
                    },
                ]
            }
        )
        client = MagicMock()
        client.get.side_effect = [inst, repos]
        client.__enter__.return_value = client
        with patch("httpx.Client", return_value=client):
            result = self.p.get_user_repos("tok")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "repo")
        self.assertEqual(result[0]["url"], "http://h/repo")

    def test_get_user_repos_repo_response_non_200(self):
        inst = _mock_response(json_data={"installations": [{"id": "i1"}]})
        repos = _mock_response(status_code=500)
        client = MagicMock()
        client.get.side_effect = [inst, repos]
        client.__enter__.return_value = client
        with patch("httpx.Client", return_value=client):
            result = self.p.get_user_repos("tok")
        self.assertEqual(result, [])

    def test_refresh_access_token(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.post.return_value = (
                _mock_response(json_data={"access_token": "new"})
            )
            data = self.p.refresh_access_token("ref")
            self.assertEqual(data["access_token"], "new")

    def test_refresh_access_token_error(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.post.return_value = (
                _mock_response(
                    json_data={"error": "x", "error_description": "bad"}
                )
            )
            with self.assertRaises(ValueError):
                self.p.refresh_access_token("ref")

    def test_fetch_readme_404(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(status_code=404)
            )
            self.assertIsNone(self.p._fetch_readme("owner", "repo", "tok"))

    def test_fetch_readme_ok(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(text="# readme")
            )
            text = self.p._fetch_readme("owner", "repo", "tok")
            self.assertEqual(text, "# readme")

    def test_get_readme_missing_owner(self):
        account = MagicMock()
        account.access_token_expires_at = None
        account.refresh_token = None
        with self.assertRaises(ValueError):
            self.p.get_readme(MagicMock(owner=None, name=None), account)

    def test_get_readme_ok(self):
        repo = MagicMock()
        repo.owner = "owner"
        repo.name = "repo"
        account = MagicMock()
        account.access_token = "tok"
        account.refresh_token = None
        account.access_token_expires_at = None
        with patch.object(self.p, "_fetch_readme", return_value="# doc"):
            text = self.p.get_readme(repo, account)
            self.assertEqual(text, "# doc")

    def test_get_readme_non_401_raises(self):
        from httpx import HTTPStatusError

        repo = MagicMock()
        repo.owner = "owner"
        repo.name = "repo"
        account = MagicMock()
        account.access_token = "tok"
        account.refresh_token = None
        account.access_token_expires_at = None
        resp = MagicMock(status_code=403)
        with patch.object(
            self.p,
            "_fetch_readme",
            side_effect=HTTPStatusError(
                "u", request=MagicMock(), response=resp
            ),
        ):
            with self.assertRaises(HTTPStatusError):
                self.p.get_readme(repo, account)

    def test_get_readme_refresh_with_expiry(self):
        from httpx import HTTPStatusError

        repo = MagicMock()
        repo.owner = "owner"
        repo.name = "repo"
        account = MagicMock()
        account.access_token = "old"
        account.access_token_expires_at = None
        account.refresh_token = "ref"
        account.save = MagicMock()
        resp = MagicMock(status_code=401)
        with patch.object(self.p, "_fetch_readme") as fr:
            fr.side_effect = [
                HTTPStatusError("u", request=MagicMock(), response=resp),
                "new",
            ]
            with patch.object(
                self.p,
                "refresh_access_token",
                return_value={"access_token": "new", "expires_in": 60},
            ):
                text = self.p.get_readme(repo, account)
        self.assertEqual(text, "new")

    def test_refresh_if_needed_refreshes(self):
        account = MagicMock()
        account.access_token_expires_at = timezone.now() - timedelta(minutes=1)
        account.refresh_token = "ref"
        account.save = MagicMock()
        with patch.object(
            self.p,
            "refresh_access_token",
            return_value={
                "access_token": "new",
                "refresh_token": "nr",
                "expires_in": 60,
            },
        ):
            self.p._refresh_if_needed(account)
        self.assertEqual(account.access_token, "new")
        self.assertIsNotNone(account.access_token_expires_at)

    def test_refresh_if_needed_no_expires_in(self):
        account = MagicMock()
        account.access_token_expires_at = timezone.now() - timedelta(minutes=1)
        account.refresh_token = "ref"
        account.save = MagicMock()
        with patch.object(
            self.p,
            "refresh_access_token",
            return_value={"access_token": "new"},
        ):
            self.p._refresh_if_needed(account)
        self.assertEqual(account.access_token, "new")

    def test_get_readme_401_refreshes(self):
        repo = MagicMock()
        repo.owner = "owner"
        repo.name = "repo"
        account = MagicMock()
        account.access_token = "old"
        account.access_token_expires_at = None
        account.refresh_token = "ref"
        with patch.object(self.p, "_fetch_readme") as fr:
            from httpx import HTTPStatusError

            resp = MagicMock(status_code=401)
            fr.side_effect = [
                HTTPStatusError("u", request=MagicMock(), response=resp),
                "new readme",
            ]
            with patch.object(
                self.p,
                "refresh_access_token",
                return_value={"access_token": "new", "refresh_token": "nr"},
            ):
                text = self.p.get_readme(repo, account)
            self.assertEqual(text, "new readme")
            self.assertEqual(account.access_token, "new")

    def test_get_readme_401_no_refresh(self):
        repo = MagicMock()
        repo.owner = "owner"
        repo.name = "repo"
        account = MagicMock()
        account.access_token = "old"
        account.access_token_expires_at = None
        account.refresh_token = None
        from httpx import HTTPStatusError

        resp = MagicMock(status_code=401)
        with patch.object(
            self.p,
            "_fetch_readme",
            side_effect=HTTPStatusError(
                "u", request=MagicMock(), response=resp
            ),
        ):
            with self.assertRaises(HTTPStatusError):
                self.p.get_readme(repo, account)


class GitlabProviderTest(SimpleTestCase):
    def setUp(self):
        self.req = MagicMock()
        self.req.META = {"REMOTE_ADDR": "1.2.3.4"}
        with patch("users.providers.settings") as ms:
            ms.BACKEND_URL = "http://backend"
            ms.GITLAB_CLIENT_ID = "cid"
            ms.GITLAB_SECRET = "secret"
            self.p = GitlabProvider(self.req)

    def test_get_auth_url_with_state(self):
        url = self.p.get_auth_url(state="mystate")
        self.assertIn("state=mystate", url)

    def test_get_user_info(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"id": 1})
            )
            data = self.p.get_user_info("tok", {})
            self.assertEqual(data["id"], 1)

    def test_get_user_repos(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(
                    json_data=[
                        {
                            "id": "1",
                            "path_with_namespace": "g/r",
                            "web_url": "http://g/r/",
                            "visibility": "public",
                            "namespace": {"avatar_url": "http://a"},
                        }
                    ]
                )
            )
            repos = self.p.get_user_repos("tok")
            self.assertEqual(repos[0]["name"], "g/r")
            self.assertEqual(repos[0]["url"], "http://g/r")

    def test_refresh_access_token(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.post.return_value = (
                _mock_response(json_data={"access_token": "new"})
            )
            data = self.p.refresh_access_token("ref")
            self.assertEqual(data["access_token"], "new")

    def test_get_readme_404(self):
        repo = MagicMock()
        repo.owner = MagicMock()
        repo.owner.username = "owner"
        repo.organization = None
        repo.repo_id = None
        repo.name = "repo"
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(status_code=404)
            )
            self.assertIsNone(self.p.get_readme(repo))

    def test_get_readme_ok_base64(self):
        repo = MagicMock()
        repo.owner = MagicMock()
        repo.owner.username = "owner"
        repo.organization = None
        repo.repo_id = None
        repo.name = "repo"
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(
                    json_data={
                        "content": base64.b64encode(b"hello").decode(),
                        "encoding": "base64",
                    }
                )
            )
            text = self.p.get_readme(repo, access_token="tok")
            self.assertEqual(text, "hello")

    def test_get_readme_ok_plain_no_content(self):
        repo = MagicMock()
        repo.owner = MagicMock()
        repo.owner.username = "owner"
        repo.organization = None
        repo.repo_id = "123"
        repo.name = "repo"
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"content": ""})
            )
            self.assertIsNone(self.p.get_readme(repo))

    def test_get_readme_plain_content(self):
        repo = MagicMock()
        repo.owner = MagicMock()
        repo.owner.username = "owner"
        repo.organization = None
        repo.repo_id = "123"
        repo.name = "repo"
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"content": "# plain"})
            )
            text = self.p.get_readme(repo)
            self.assertEqual(text, "# plain")


class GoogleProviderTest(SimpleTestCase):
    def setUp(self):
        self.req = MagicMock()
        self.req.META = {"REMOTE_ADDR": "1.2.3.4"}
        with patch("users.providers.settings") as ms:
            ms.BACKEND_URL = "http://backend"
            ms.GOOGLE_CLIENT_ID = "cid"
            ms.GOOGLE_SECRET = "secret"
            self.p = GoogleProvider(self.req)

    def test_get_token(self):
        flow = MagicMock()
        flow.credentials.token = "at"
        flow.credentials.refresh_token = "rt"
        flow.credentials.expiry = None
        flow.credentials.scopes = ["openid"]
        flow.fetch_token = MagicMock()
        with patch(
            "users.providers.Flow.from_client_config", return_value=flow
        ):
            data = self.p.get_token("code")
            self.assertEqual(data["access_token"], "at")

    def test_get_auth_url(self):
        url = self.p.get_auth_url()
        self.assertIn("https://accounts.google.com/o/oauth2/v2/auth", url)

    def test_get_user_info(self):
        with patch("httpx.Client") as MC:
            MC.return_value.__enter__.return_value.get.return_value = (
                _mock_response(json_data={"id": "x"})
            )
            data = self.p.get_user_info("tok")
            self.assertEqual(data["id"], "x")

    def test_get_readme_none(self):
        self.assertIsNone(self.p.get_readme(MagicMock()))
