from django.test import TestCase, override_settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.cache import cache

from users.models import CustomUser
from vis.brasil import models as brasil


POLYGON = GEOSGeometry(
    "POLYGON((-46.6 -23.5, -46.4 -23.5, -46.4 -23.6, -46.6 -23.6, "
    "-46.6 -23.5))"
)


@override_settings(ROOT_URLCONF="maps.tests.urls")
class MapsAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = CustomUser.objects.create_user(
            username="maptest",
            email="map@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth = {"HTTP_X_UID_KEY": self.user.api_key()}

        self.macroregion, _ = brasil.Macroregion.objects.get_or_create(
            geocode="9", defaults={"name": "Teste"}
        )
        self.state, _ = brasil.State.objects.get_or_create(
            geocode="99",
            defaults={
                "name": "Teste State",
                "uf": "TS",
                "macroregion": self.macroregion,
            },
        )
        self.mesoregion, _ = brasil.Mesoregion.objects.get_or_create(
            geocode="9901",
            defaults={
                "name": "Teste Meso",
                "state": self.state,
            },
        )
        self.microregion, _ = brasil.Microregion.objects.get_or_create(
            geocode="99001",
            defaults={
                "name": "Teste Micro",
                "mesoregion": self.mesoregion,
            },
        )
        self.city, _ = brasil.City.objects.get_or_create(
            geocode="9999999",
            defaults={
                "name": "Teste City",
                "microregion": self.microregion,
            },
        )
        brasil.GeoCity.objects.get_or_create(
            city=self.city, defaults={"geometry": POLYGON}
        )
        brasil.GeoState.objects.get_or_create(
            state=self.state, defaults={"geometry": POLYGON}
        )

    def test_city_boundaries(self):
        resp = self.client.get("/maps/cities/ts", **self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["type"], "FeatureCollection")
        props = [f["properties"] for f in data["features"]]
        self.assertIn({"geocode": "9999999", "name": "Teste City"}, props)

    def test_city_boundaries_no_results(self):
        resp = self.client.get("/maps/cities/zz", **self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["features"], [])

    def test_state_boundaries_all(self):
        resp = self.client.get("/maps/states", **self.auth)
        self.assertEqual(resp.status_code, 200)
        siglas = [f["properties"]["sigla"] for f in resp.json()["features"]]
        self.assertIn("TS", siglas)

    def test_state_boundaries_filtered(self):
        resp = self.client.get("/maps/states", {"uf": "ts"}, **self.auth)
        self.assertEqual(resp.status_code, 200)
        siglas = [f["properties"]["sigla"] for f in resp.json()["features"]]
        self.assertIn("TS", siglas)

    def test_state_boundaries_filtered_none_match(self):
        resp = self.client.get("/maps/states", {"uf": "zz"}, **self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["features"], [])


class MapsLayersImportTest(TestCase):
    def test_layers_importable(self):
        from maps import layers

        self.assertEqual(layers.CentroidLayer.model._meta.app_label, "maps")
        self.assertEqual(layers.PolygonLayer.id, "polygons")
        self.assertEqual(layers.MultipolygonLayer.id, "multipolygons")
