from django.contrib import admin
from .models import Tag, Author, Model, Prediction, ImplementationLanguage


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "color", "active")
    list_filter = ("group", "active")
    search_fields = ("name", "group")
    list_editable = ("active",)
    ordering = ("group", "name")


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
        "tags",
        "description",
        "author__name",
        "author__institution",
        "repository",
        "implementation_language",
        "type",
        "created",
    )
    list_filter = (
        "spatial",
        "categorical",
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
