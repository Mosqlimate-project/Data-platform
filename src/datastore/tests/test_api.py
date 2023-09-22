import requests
from datetime import datetime, timedelta
from django.test import Client, TestCase


class DatastoreAPITest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_historico_alerta_with_requests(self):
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=180)

        url = "https://api.mosqlimate.org/api/datastore/historico_alerta/?"
        pagination = "page=%s&per_page=100&"
        filters = f"start={start_date}&end={end_date}"

        r = requests.get(url + pagination % (1) + filters, timeout=60)
        items = r.json()["items"]
        pages = r.json()["pagination"]
        self.assertEqual(r.status_code, 200)
        self.assertEqual(any(items), True)
        self.assertLessEqual(
            int(pages["total_items"]),
            int(pages["total_pages"]) * int(pages["per_page"]),
        )
        self.assertGreaterEqual(
            int(pages["total_items"]),
            int(pages["total_pages"]) * (int(pages["per_page"]) - 1),
        )

    def test_copernicus_brasil_with_requests(self):
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=180)

        url = "https://api.mosqlimate.org/api/datastore/copernicus_brasil/?"
        pagination = "page=%s&per_page=100&"
        filters = f"start={start_date}&end={end_date}&geocode=3304557"

        r = requests.get(url + pagination % (1) + filters, timeout=60)
        items = r.json()["items"]
        self.assertEqual(r.status_code, 200)
        self.assertEqual(any(items), True)
