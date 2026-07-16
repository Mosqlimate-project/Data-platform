from django.test import Client, TestCase
from users.models import CustomUser


class EpiScannerAPITest(TestCase):
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

    def test_states(self):
        r = self.client.get(
            "/api/datastore/episcanner/states/",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        self.assertIn("code", data[0])
        self.assertIn("name", data[0])

    def test_cities_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/cities/?disease=dengue&uf=CE",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("geocode", data[0])
            self.assertIn("name", data[0])

    def test_cities_missing_params(self):
        r = self.client.get(
            "/api/datastore/episcanner/cities/?disease=dengue",
            **self.auth_headers,
            timeout=30,
        )
        self.assertNotEqual(r.status_code, 200)

    def test_parameters_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/parameters/?disease=dengue&uf=CE",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("cid10", data[0])
            self.assertIn("r0", data[0])
            self.assertIn("year", data[0])

    def test_timeseries_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/timeseries/"
            "?disease=dengue&uf=CE&geocode=2300101&year=2024",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("date", data[0])
            self.assertIn("casos", data[0])

    def test_timeseries_missing_geocode(self):
        r = self.client.get(
            "/api/datastore/episcanner/timeseries/" "?disease=dengue&uf=CE",
            **self.auth_headers,
            timeout=30,
        )
        self.assertNotEqual(r.status_code, 200)

    def test_top_cities_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/top-cities/"
            "?disease=dengue&uf=CE&limit=5",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 5)
        if data:
            self.assertIn("name_muni", data[0])
            self.assertIn("transmissao", data[0])

    def test_maps_weeks_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/weeks/?disease=dengue&uf=CE",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("code_muni", data[0])
            self.assertIn("transmissao", data[0])

    def test_maps_r0_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/r0/"
            "?disease=dengue&uf=CE&year=2024",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("r0Data", data)
        self.assertIn("topR0", data)
        self.assertIsInstance(data["r0Data"], list)
        self.assertIsInstance(data["topR0"], list)

    def test_maps_model_eval_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/model-eval/"
            "?disease=dengue&uf=CE&year=2024",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("rateMap", data)
        self.assertIn("table", data)

    def test_get_episcanner_dengue_ce(self):
        r = self.client.get(
            "/api/datastore/episcanner/?disease=dengue&uf=CE&year=2024",
            **self.auth_headers,
            timeout=30,
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("disease", data[0])
            self.assertIn("CID10", data[0])
            self.assertIn("R0", data[0])
