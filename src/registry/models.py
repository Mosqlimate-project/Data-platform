import os
from io import StringIO
from typing import List, Union, Literal

import pandas as pd

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from vis.dash import checks


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


class ImplementationLanguage(models.Model):
    language = models.CharField(
        max_length=100, null=False, blank=False, unique=True
    )
    svg_path = models.FilePathField(
        path=get_plangs_path(), match=".svg$", null=True
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.language}"

    class Meta:
        verbose_name = _("Implementation Language")
        verbose_name_plural = _("Implementation Languages")


class Author(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
    )
    institution = models.CharField(max_length=100, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name}"

    class Meta:
        verbose_name = _("Author")
        verbose_name_plural = _("Authors")


class Model(models.Model):
    class Diseases(models.TextChoices):
        CHIKUNGUNYA = "chikungunya", _("Chikungunya")
        DENGUE = "dengue", _("Dengue")
        ZIKA = "zika", _("Zika")

    class Periodicities(models.TextChoices):
        DAY = "day", _("Day")
        WEEK = "week", _("Week")
        MONTH = "month", _("Month")
        YEAR = "year", _("Year")

    class ADM_levels(models.IntegerChoices):
        NATIONAL = 0, _("National")
        STATE = 1, _("State")
        MUNICIPALITY = 2, _("Municipality")
        SUB_MUNICIPALITY = 3, _("Sub Municipality")

    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, null=False, blank=False
    )
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    repository = models.CharField(max_length=100, null=False, blank=False)
    implementation_language = models.ForeignKey(
        ImplementationLanguage,
        on_delete=models.PROTECT,
        null=False,
        blank=False,
    )
    type = models.CharField(max_length=100, null=False, blank=True)
    disease = models.CharField(
        choices=Diseases.choices, null=True
    )  # TODO: change to false
    ADM_level = models.IntegerField(
        choices=ADM_levels.choices, null=True
    )  # TODO: Change to false
    time_resolution = models.CharField(
        choices=Periodicities.choices, null=True
    )  # TODO: change to false
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    def get_visualizables(self) -> dict[str:list]:
        visualizables = {}
        predictions = Prediction.objects.filter(model=self)
        line_charts = [
            p for p in predictions if "LineChart" in p.visualizable()
        ]
        if line_charts:
            visualizables["LineChart"] = line_charts
        return visualizables

    class Meta:
        verbose_name = _("Model")
        verbose_name_plural = _("Models")


class Prediction(models.Model):
    model = models.ForeignKey(Model, on_delete=models.CASCADE, null=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    commit = models.CharField(max_length=100, null=False, blank=False)
    predict_date = models.DateField()
    prediction = models.JSONField(null=False, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.commit}"  # TODO: Change it

    def visualizable(
        self,
    ) -> List[
        Union[
            Literal[
                "LineChart",
                # Add more compatible charts here
            ]
        ]
    ]:
        """
        Returns a list of compatible charts the Prediction can be visualized on
        """
        compatible_charts = []  # None if not visualizable

        try:
            df = pd.read_json(StringIO(self.prediction))
            if checks.line_chart(df):
                compatible_charts.append("LineChart")
        except TypeError:
            # TODO: add a better error handling to not visualizable preds
            pass

        return compatible_charts

    def get_geocodes(self) -> set[int]:
        """
        This methods can be used only if the Model.ADM_level is 2.
        Extracts a set of geocodes from self.prediction
        """
        geocodes = []

        try:
            df = pd.read_json(StringIO(self.prediction))
            geocodes = list(df["adm_2"].unique())
        except TypeError:
            # TODO: add a better error handling geocode errors
            pass

        return geocodes

    class Meta:
        verbose_name = _("Prediction")
        verbose_name_plural = _("Predictions")
