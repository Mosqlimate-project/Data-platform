from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialAccount


class CreateAuthorTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.User = get_user_model()
        self.user = self.User.objects.create_user(
            username="testuser",
            email="test@test.com",
            first_name="Test",
            last_name="User",
            password="testpassword",
        )
        self.social_account = SocialAccount.objects.create(
            user=self.user,
            provider="github",
            uid="123456",
        )
        self.client.force_login(self.user)

    def test_create_author_with_authenticated_user(self):
        response = self.client.get(
            f"/api/registry/authors/{self.user.username}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["username"], "testuser")
        self.assertEqual(response.json()["institution"], None)

    def tearDown(self):
        self.social_account.delete()
        self.user.delete()
