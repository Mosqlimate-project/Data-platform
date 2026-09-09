from django.test import TestCase, RequestFactory

from registry.utils import calling_via_swagger


class CallingViaSwaggerTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_returns_true_when_referer_is_api_docs(self):
        request = self.factory.get(
            "/api/registry/models/", HTTP_REFERER="/api/docs/"
        )
        self.assertTrue(calling_via_swagger(request))

    def test_returns_false_when_referer_is_not_api_docs(self):
        request = self.factory.get(
            "/api/registry/models/", HTTP_REFERER="/some/other/path/"
        )
        self.assertFalse(calling_via_swagger(request))

    def test_returns_false_when_no_referer(self):
        request = self.factory.get("/api/registry/models/")
        self.assertFalse(calling_via_swagger(request))

    def test_returns_false_when_referer_has_no_path(self):
        request = self.factory.get("/api/registry/models/", HTTP_REFERER="")
        self.assertFalse(calling_via_swagger(request))
