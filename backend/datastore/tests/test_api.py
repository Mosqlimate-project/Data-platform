from datetime import datetime, timedelta
from django.test import Client, TestCase
from users.models import CustomUser


class DatastoreAPITest(TestCase):
    databases = {"default", "infodengue"}

    def setUp(self):
        self.client = Client()
        self.user = CustomUser.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth_headers = {"HTTP_X_UID_KEY": self.user.api_key()}

    def test_historico_alerta_dengue_with_requests(self):
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=180)

        url = "/api/datastore/infodengue/?"
        filters = f"disease=dengue&start={start_date}&end={end_date}"

        r = self.client.get(
            url + "page=1&per_page=10&" + filters,
            **self.auth_headers,
            timeout=60,
        )
        self.assertEqual(r.status_code, 200)

    def test_copernicus_brasil_with_requests(self):
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=180)

        url = "/api/datastore/climate/?"
        filters = f"start={start_date}&end={end_date}&geocode=3304557"

        r = self.client.get(
            url + "page=1&per_page=10&" + filters,
            **self.auth_headers,
            timeout=60,
        )
        self.assertEqual(r.status_code, 200)
