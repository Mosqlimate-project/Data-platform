from django.test import TestCase
from django.core.cache import cache
from datetime import datetime as dt
from datastore.models import HistoricoAlerta
from vis.vis_charts import national_total_cases_data, uf_ibge_mapping
import unittest


class EchartsVisDataTestCase(TestCase):
    def setUp(self):
        pass

    @unittest.skip(
        "Database migrations didn't find the 'historico_alerta' table"
    )
    def test_get_data(self):
        """ """
        current_year = dt.now().year
        disease = "dengue"
        cache.clear()
        HistoricoAlerta.objects.create(
            data_iniSE=f"{current_year}-01-01",
            municipio_geocodigo="3304557",
            casos=68253,
        )

        response = national_total_cases_data(disease, current_year)

        self.assertEqual(len(response), len(uf_ibge_mapping))
        for result in response:
            self.assertIn("name", result)
            self.assertIn("value", result)
            self.assertIsInstance(result["name"], str)
            self.assertIsInstance(result["value"], int)
            self.assertIn(
                result["name"],
                [data["name"] for data in uf_ibge_mapping.values()],
            )

        entry_3304557 = next(
            (
                result
                for result in response
                if result["name"] == "Rio de Janeiro"
            ),
            None,
        )
        self.assertIsNotNone(entry_3304557)
        self.assertEqual(entry_3304557["value"], 68253)

        self.assertIn(
            "Rio de Janeiro", [result["name"] for result in response]
        )

    def tearDown(self):
        """
        Clean up resources or data created during the tests, if needed.
        """
        cache.clear()
