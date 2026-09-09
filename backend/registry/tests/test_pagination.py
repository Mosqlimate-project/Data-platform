from django.test import TestCase

from registry.pagination import PagesPagination


class _Page:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class PagesPaginationTest(TestCase):
    def setUp(self):
        self.paginator = PagesPagination()

    def _queryset(self, size):
        return list(range(size))

    def test_pagination_basic(self):
        qs = self._queryset(10)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=5)
        )
        self.assertEqual(result["items"], [0, 1, 2, 3, 4])
        self.assertEqual(result["pagination"]["total_pages"], 2)
        self.assertEqual(result["pagination"]["total_items"], 10)
        self.assertEqual(result["pagination"]["page"], 1)
        self.assertEqual(result["pagination"]["items"], 5)
        self.assertEqual(result["pagination"]["per_page"], 5)
        self.assertEqual(result["message"], "")

    def test_pagination_incomplete_page(self):
        qs = self._queryset(7)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=5)
        )
        self.assertEqual(result["items"], [0, 1, 2, 3, 4])
        self.assertEqual(result["pagination"]["total_pages"], 2)
        self.assertEqual(result["pagination"]["total_items"], 7)

    def test_pagination_page_exact_multiple(self):
        qs = self._queryset(10)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=5)
        )
        self.assertEqual(result["pagination"]["total_pages"], 2)

    def test_pagination_exceeds_max_per_page(self):
        qs = self._queryset(100)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=500)
        )
        self.assertEqual(result["pagination"]["per_page"], 300)
        self.assertIn("Maximum items per page exceeded", result["message"])

    def test_pagination_per_page_less_than_one(self):
        qs = self._queryset(10)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=0)
        )
        self.assertEqual(result["pagination"]["per_page"], 1)
        self.assertEqual(result["message"], "The minimum items per page is 1")

    def test_pagination_negative_page(self):
        qs = self._queryset(10)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=-1, per_page=5)
        )
        self.assertEqual(result["pagination"]["page"], 1)
        self.assertIn("Incorrect page", result["message"])

    def test_pagination_empty_queryset(self):
        qs = self._queryset(0)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=1, per_page=5)
        )
        self.assertEqual(result["items"], [])
        self.assertEqual(result["pagination"]["total_pages"], 1)
        self.assertEqual(result["pagination"]["total_items"], 0)

    def test_pagination_second_page(self):
        qs = self._queryset(12)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=2, per_page=5)
        )
        self.assertEqual(result["items"], [5, 6, 7, 8, 9])
        self.assertEqual(result["pagination"]["page"], 2)
        self.assertEqual(result["pagination"]["total_pages"], 3)

    def test_pagination_last_incomplete_page(self):
        qs = self._queryset(12)
        result = self.paginator.paginate_queryset(
            qs, _Page(page=3, per_page=5)
        )
        self.assertEqual(result["items"], [10, 11])
        self.assertEqual(result["pagination"]["total_pages"], 3)
