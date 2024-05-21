from django.contrib import admin
from .models import ResultsProbForecast


@admin.register(ResultsProbForecast)
class ResultsProbForecastAdmin(admin.ModelAdmin):
    list_display = ("model", "date", "disease", "geocode")
    # search_fields = ("language",)
    date_hierarchy = "date"
