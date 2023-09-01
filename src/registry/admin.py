from django.contrib import admin
from .models import Author, Model, Prediction, ImplementationLanguage


@admin.register(ImplementationLanguage)
class ImplementationLanguageAdmin(admin.ModelAdmin):
    list_display = ("__str__", "svg_path")
    search_fields = ("language",)
    date_hierarchy = "updated"


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("__str__",)
    search_fields = (
        "user",
        "institution",
    )
    date_hierarchy = "updated"


@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "author",
        "repository",
        "__str__",
    )
    list_display_links = ("__str__",)
    search_fields = (
        "name",
        "description",
        "author__name",
        "author__institution",
        "repository",
        "implementation_language",
        "type",
        "created",
    )
    list_filter = (
        "type",
        "implementation_language",
    )
    date_hierarchy = "updated"


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = (
        "created",
        "predict_date",
        "__str__",
    )
    list_display_links = ("__str__",)
    search_fields = (
        "model__name",
        "model__author",
        "model__description",
        "commit",
        "created",
        "predict_date",
    )
    date_hierarchy = "updated"
