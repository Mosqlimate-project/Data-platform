# from django.test import TestCase
# from django.core.cache import cache
# from django.db.models import Max
# from datetime import datetime as dt
# from datastore.models import HistoricoAlerta
# from vis.plots.home.vis_charts import (
#     national_total_cases_data,
#     get_last_available_year,
#     uf_ibge_mapping,
# )
# import unittest


# FIXME: infodengue db results must be mocked // External connection
# class EchartsVisDataTestCase(TestCase):
#     def setUp(self):
#         pass
#
#     @unittest.skip(
#         "Database migrations didn't find the 'historico_alerta' table"
#     )
#     def test_get_data(self):
#         """ """
#         current_year = dt.now().year
#         disease = "dengue"
#         cache.clear()
#         HistoricoAlerta.objects.create(
#             data_iniSE=f"{current_year}-01-01",
#             municipio_geocodigo="3304557",
#             casos=68253,
#         )
#
#         response = national_total_cases_data(disease, current_year)
#
#         self.assertEqual(len(response), len(uf_ibge_mapping))
#         for result in response:
#             self.assertIn("name", result)
#             self.assertIn("value", result)
#             self.assertIsInstance(result["name"], str)
#             self.assertIsInstance(result["value"], int)
#             self.assertIn(
#                 result["name"],
#                 [data["name"] for data in uf_ibge_mapping.values()],
#             )
#
#         entry_3304557 = next(
#             (
#                 result
#                 for result in response
#                 if result["name"] == "Rio de Janeiro"
#             ),
#             None,
#         )
#         self.assertIsNotNone(entry_3304557)
#         self.assertEqual(entry_3304557["value"], 68253)
#
#         self.assertIn(
#             "Rio de Janeiro", [result["name"] for result in response]
#         )
#
#     def test_get_last_available_year(self):
#         uf = "RJ"
#         disease = "dengue"
#
#         # Get the maximum available year from the dataset
#         max_available_year = HistoricoAlerta.objects.using(
#             "infodengue"
#         ).aggregate(max_year=Max("data_iniSE__year"))["max_year"]
#
#         last_available_year = get_last_available_year(uf, disease)
#
#         self.assertIsNotNone(last_available_year)
#         self.assertIsInstance(last_available_year, int)
#         self.assertGreaterEqual(last_available_year, 1970)
#
#         self.assertLessEqual(last_available_year, max_available_year)
#
#         # Ensure that there is data for the given UF and disease
#         # in the last available year
#         data = HistoricoAlerta.objects.using("infodengue").filter(
#             municipio_geocodigo__startswith=uf_ibge_mapping[uf]["code"],
#             data_iniSE__year=last_available_year,
#         )
#         self.assertTrue(
#             data.exists(),
#             f"No data found for {uf} and {disease} in {last_available_year}",
#         )
#
#     def tearDown(self):
#         """
#         Clean up resources or data created during the tests, if needed.
#         """
#         cache.clear()
