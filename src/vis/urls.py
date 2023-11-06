from django.urls import path

from . import views
from .templatetags.components.line_chart import app as test  # noqa
from .templatetags.components.home_chart import app as home_chart  # noqa

urlpatterns = [
    path("", views.index, name="index"),
]
