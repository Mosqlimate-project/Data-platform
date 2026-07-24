from datetime import date

from django.test import TestCase
from django.test import Client
from django.contrib.auth import get_user_model

from datastore.models import Adm0, Adm1, Adm2, Disease, ICD
from registry.models import (
    Repository,
    RepositoryModel,
    Sprint,
    ModelPrediction,
)


class DashboardTreeTest(TestCase):
    def setUp(self):
        self.client = Client()

        icd = ICD.objects.create(system="ICD-10", version="2019")
        self.disease_a90 = Disease.objects.create(
            icd=icd, code="A90", name="Dengue"
        )
        self.disease_a92 = Disease.objects.create(
            icd=icd, code="A92.5", name="Zika"
        )

        self.country_bra = Adm0.objects.create(geocode="XYZ", name="Testland")
        self.country_arg = Adm0.objects.create(geocode="ABC", name="Otherland")

        self.state_rj = Adm1.objects.create(
            geocode="99", name="Test State", country=self.country_bra
        )
        self.state_sp = Adm1.objects.create(
            geocode="88", name="Other State", country=self.country_bra
        )

        self.city_rj = Adm2.objects.create(
            geocode="9999991", name="Test City", adm1=self.state_rj
        )

        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@test.com", password="testpass"
        )

        self.sprint = Sprint.objects.create(
            year=2024, start_date=date(2024, 1, 1), end_date=date(2024, 12, 31)
        )

    _repo_counter = 0

    def _create_model(
        self, category="quantitative", sprint=None
    ) -> RepositoryModel:
        self._repo_counter += 1
        repo = Repository.objects.create(
            repo_id=f"r{self._repo_counter}",
            name=f"test-repo-{self._repo_counter}",
            provider="github",
            owner=self.user,
        )
        return RepositoryModel.objects.create(
            repository=repo,
            category=category,
            time_resolution="week",
            sprint=sprint,
        )

    def _create_prediction(self, **kwargs):
        defaults = dict(
            commit="abc123",
            published=True,
        )
        defaults.update(kwargs)
        return ModelPrediction.objects.create(**defaults)

    def test_diseases_map_keyed_by_cat_admlevel_imdc(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        data = resp.json()
        diseases = data["diseases"]

        key = "quantitative|0|none"
        self.assertIn(key, diseases)
        self.assertEqual(len(diseases[key]), 1)
        self.assertEqual(diseases[key][0], {"code": "A90", "name": "Dengue"})

    def test_diseases_map_grouped_by_category(self):
        quant = self._create_model(category="quantitative")
        cat = self._create_model(category="categorical")
        self._create_prediction(
            model=quant,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )
        self._create_prediction(
            model=cat,
            disease=self.disease_a92,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        data = resp.json()
        diseases = data["diseases"]

        self.assertIn("quantitative|0|none", diseases)
        self.assertIn("categorical|0|none", diseases)

    def test_sprint_and_nonsprint_have_different_keys(self):
        nosprint = self._create_model()
        with_sprint = self._create_model(sprint=self.sprint)
        self._create_prediction(
            model=nosprint,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )
        self._create_prediction(
            model=with_sprint,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        data = resp.json()

        self.assertIn("quantitative|0|none", data["diseases"])
        self.assertIn("quantitative|0|2024", data["diseases"])

    def test_countries_map_country_level(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        countries = resp.json()["countries"]

        key = "quantitative|0|A90|none"
        self.assertIn(key, countries)
        self.assertIn({"geocode": "XYZ", "name": "Testland"}, countries[key])

    def test_countries_map_looked_up_via_adm1(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=1,
            adm1=self.state_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        countries = resp.json()["countries"]

        key = "quantitative|1|A90|none"
        self.assertIn(key, countries)
        self.assertIn({"geocode": "XYZ", "name": "Testland"}, countries[key])

    def test_countries_map_looked_up_via_adm2(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=2,
            adm2=self.city_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        countries = resp.json()["countries"]

        key = "quantitative|2|A90|none"
        self.assertIn(key, countries)
        self.assertIn({"geocode": "XYZ", "name": "Testland"}, countries[key])

    def test_states_map_state_level(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=1,
            adm1=self.state_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        states = resp.json()["states"]

        key = "quantitative|1|A90|XYZ|none"
        self.assertIn(key, states)
        self.assertIn({"geocode": "99", "name": "Test State"}, states[key])

    def test_states_map_looked_up_via_adm2(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=2,
            adm2=self.city_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        states = resp.json()["states"]

        key = "quantitative|2|A90|XYZ|none"
        self.assertIn(key, states)
        self.assertIn({"geocode": "99", "name": "Test State"}, states[key])

    def test_cities_map_municipality_level(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=2,
            adm2=self.city_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        cities = resp.json()["cities"]

        key = "quantitative|2|A90|XYZ|99|none"
        self.assertIn(key, cities)
        self.assertIn({"geocode": "9999991", "name": "Test City"}, cities[key])

    def test_cities_empty_for_higher_adm_levels(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=1,
            adm1=self.state_rj,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        cities = resp.json()["cities"]
        self.assertEqual(cities, {})

    def test_unmapped_category_skipped(self):
        model = self._create_model(category="spatial_quantitative")
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        diseases = resp.json()["diseases"]

        self.assertIn("quantitative|0|none", diseases)

    def test_multiple_diseases_same_key(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )
        self._create_prediction(
            model=model,
            disease=self.disease_a92,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        diseases = resp.json()["diseases"]

        key = "quantitative|0|none"
        codes = {d["code"] for d in diseases[key]}
        self.assertEqual(codes, {"A90", "A92.5"})

    def test_entries_sorted_by_code_or_geocode(self):
        model = self._create_model()
        self._create_prediction(
            model=model,
            disease=self.disease_a92,
            adm_level=0,
            adm0=self.country_arg,
        )
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        data = resp.json()

        codes = [d["code"] for d in data["diseases"]["quantitative|0|none"]]
        self.assertEqual(codes, ["A90", "A92.5"])

        geos = [
            c["geocode"] for c in data["countries"]["quantitative|0|A90|none"]
        ]
        self.assertEqual(geos, ["XYZ"])

    def test_sprint_key_uses_year_string(self):
        model = self._create_model(sprint=self.sprint)
        self._create_prediction(
            model=model,
            disease=self.disease_a90,
            adm_level=0,
            adm0=self.country_bra,
        )

        resp = self.client.get("/api/vis/dashboard/tree/")
        diseases = resp.json()["diseases"]

        self.assertIn("quantitative|0|2024", diseases)
        self.assertNotIn("quantitative|0|true", diseases)
