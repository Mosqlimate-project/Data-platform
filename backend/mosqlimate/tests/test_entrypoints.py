"""Smoke tests that import the deployment entrypoints and environment
settings. These modules are normally only loaded by the WSGI/ASGI servers
or a specific environment, so importing them here both verifies they are
valid and gives them test coverage.
"""

import importlib

from django.test import SimpleTestCase


class ProjectEntrypointTest(SimpleTestCase):
    def test_asgi_application_importable(self):
        module = importlib.import_module("mosqlimate.asgi")
        self.assertTrue(hasattr(module, "application"))

    def test_wsgi_application_importable(self):
        module = importlib.import_module("mosqlimate.wsgi")
        self.assertTrue(hasattr(module, "application"))

    def test_celery_app_importable(self):
        module = importlib.import_module("mosqlimate.celeryapp")
        self.assertTrue(hasattr(module, "app"))

    def test_urls_importable(self):
        importlib.import_module("mosqlimate.urls")

    def test_dev_settings_importable(self):
        importlib.import_module("mosqlimate.settings.dev")

    def test_prod_settings_importable(self):
        importlib.import_module("mosqlimate.settings.prod")
