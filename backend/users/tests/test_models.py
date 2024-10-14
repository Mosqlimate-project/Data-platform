from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialAccount, EmailAddress


class CustomUserTest(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.user = self.User.objects.create_user(
            username="testuser",
            email="test@test.com",
            first_name="Test",
            last_name="Test",
            password="testpassword",
        )
        self.verified_user = EmailAddress.objects.create(
            user=self.user, email=self.user.email, primary=True, verified=True
        )
        self.github_account = SocialAccount.objects.create(
            provider="github",
            uid="123456",
            user=self.user,
        )
        self.client = Client()

    def test_name(self):
        user = self.User.objects.get(username="testuser")
        expected_name = "Test Test"
        self.assertEqual(user.name, expected_name)

    def test_update_name(self):
        user = self.User.objects.get(username="testuser")
        user.first_name = "Test2"
        user.last_name = "Test2"
        user.save()
        expected_name = "Test2 Test2"
        self.assertEqual(user.name, expected_name)

    def test_github_authentication(self):
        github_account = SocialAccount.objects.get(
            provider="github", user=self.user
        )
        self.assertEqual(github_account.uid, "123456")

    def test_github_login(self):
        self.client.force_login(user=self.user)

    def tearDown(self):
        self.github_account.delete()
        self.user.delete()
