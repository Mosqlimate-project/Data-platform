from datetime import date

from django.test import TestCase

from registry.filters import ModelFilterSchema, PredictionFilterSchema


class ModelFilterSchemaTest(TestCase):
    def test_initial_filter_empty(self):
        filters = ModelFilterSchema()
        self.assertIsNone(filters.id)
        self.assertIsNone(filters.repository_owner)
        self.assertIsNone(filters.repository_organization)
        self.assertIsNone(filters.repository_name)
        self.assertIsNone(filters.disease)
        self.assertIsNone(filters.adm_level)
        self.assertIsNone(filters.time_resolution)
        self.assertIsNone(filters.category)
        self.assertIsNone(filters.imdc_year)

    def test_filter_by_id(self):
        filters = ModelFilterSchema(id=1)
        self.assertEqual(filters.id, 1)

    def test_filter_by_repository_owner(self):
        filters = ModelFilterSchema(repository_owner="testuser")
        self.assertEqual(filters.repository_owner, "testuser")

    def test_filter_by_repository_organization(self):
        filters = ModelFilterSchema(repository_organization="testorg")
        self.assertEqual(filters.repository_organization, "testorg")

    def test_filter_by_repository_name(self):
        filters = ModelFilterSchema(repository_name="test-repo")
        self.assertEqual(filters.repository_name, "test-repo")

    def test_filter_by_disease(self):
        filters = ModelFilterSchema(disease="A90")
        self.assertEqual(filters.disease, "A90")

    def test_filter_by_adm_level(self):
        filters = ModelFilterSchema(adm_level=0)
        self.assertEqual(filters.adm_level, 0)

    def test_filter_by_time_resolution(self):
        filters = ModelFilterSchema(time_resolution="week")
        self.assertEqual(filters.time_resolution, "week")

    def test_filter_by_category(self):
        filters = ModelFilterSchema(category="quantitative")
        self.assertEqual(filters.category, "quantitative")

    def test_filter_by_imdc_year(self):
        filters = ModelFilterSchema(imdc_year=2024)
        self.assertEqual(filters.imdc_year, 2024)


class PredictionFilterSchemaTest(TestCase):
    def test_initial_filter_empty(self):
        filters = PredictionFilterSchema()
        self.assertIsNone(filters.id)
        self.assertIsNone(filters.model_id)
        self.assertIsNone(filters.model_owner)
        self.assertIsNone(filters.model_organization)
        self.assertIsNone(filters.model_name)
        self.assertIsNone(filters.adm_level)
        self.assertIsNone(filters.model_time_resolution)
        self.assertIsNone(filters.disease)
        self.assertIsNone(filters.model_category)
        self.assertIsNone(filters.imdc_year)
        self.assertIsNone(filters.start)
        self.assertIsNone(filters.end)

    def test_filter_by_id(self):
        filters = PredictionFilterSchema(id=5)
        self.assertEqual(filters.id, 5)

    def test_filter_by_model_id(self):
        filters = PredictionFilterSchema(model_id=10)
        self.assertEqual(filters.model_id, 10)

    def test_filter_by_model_owner(self):
        filters = PredictionFilterSchema(model_owner="testuser")
        self.assertEqual(filters.model_owner, "testuser")

    def test_filter_by_model_name(self):
        filters = PredictionFilterSchema(model_name="test-repo")
        self.assertEqual(filters.model_name, "test-repo")

    def test_filter_by_disease(self):
        filters = PredictionFilterSchema(disease="A90")
        self.assertEqual(filters.disease, "A90")

    def test_filter_by_adm_level(self):
        filters = PredictionFilterSchema(adm_level=2)
        self.assertEqual(filters.adm_level, 2)

    def test_filter_by_date_range(self):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 12, 31)
        filters = PredictionFilterSchema(start=start_date, end=end_date)
        self.assertEqual(filters.start, start_date)
        self.assertEqual(filters.end, end_date)

    def test_filter_by_model_category(self):
        filters = PredictionFilterSchema(model_category="quantitative")
        self.assertEqual(filters.model_category, "quantitative")

    def test_filter_by_imdc_year(self):
        filters = PredictionFilterSchema(imdc_year=2024)
        self.assertEqual(filters.imdc_year, 2024)
