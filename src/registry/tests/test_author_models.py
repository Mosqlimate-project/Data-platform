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
        self.client.force_login(user="testuser")

    def test_create_author_with_authenticated_user(self):
        response = self.client.post(
            "/authors/",
            {
                "user": "testuser",
                "institution": "Test Institution",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"], "testuser")
        self.assertEqual(response.data["institution"], "Test Institution")

    def tearDown(self):
        self.social_account.delete()
        self.user.delete()
