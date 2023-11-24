import os
from io import StringIO
from typing import List, Union, Literal, Self

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
            p for p in predictions if "LineChartADM2" in p.visualizable()
        ]
        if line_charts:
            visualizables["LineChartADM2"] = line_charts
        return visualizables

    def is_compatible(self, other: Self) -> bool:
        """
        Compare two Models to check if they have compatible specs
        """

        if self.type != other.type:
            print(f"{self.id} - {other.id}: different Model.type")
            return False

        if self.disease != other.disease:
            print(f"{self.id} - {other.id}: different Model.disease")
            return False

        if self.ADM_level != other.ADM_level:
            print(f"{self.id} - {other.id}: different Model.ADM_level")
            return False

        if self.time_resolution != other.time_resolution:
            print(f"{self.id} - {other.id}: different Model.time_resolution")
            return False

        return True

    def get_compatible_predictions(self, other: Self) -> list:
        ...

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

    prediction_df: pd.DataFrame = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        try:
            self.prediction_df = pd.read_json(StringIO(self.prediction))
        except TypeError:
            # TODO: add a better error handling geocode errors
            self.prediction_df = pd.DataFrame()

    def __str__(self):
        return f"{self.commit}"  # TODO: Change it

    def visualizable(
        self,
    ) -> List[
        Union[
            Literal[
                "LineChartADM2",
                # Add more compatible charts here
            ]
        ]
    ]:
        """
        Returns a list of compatible charts the Prediction can be visualized on
        """
        compatible_charts = []  # None if not visualizable

        try:
            df = self.prediction_df
            if checks.line_chart_adm2(df):
                compatible_charts.append("LineChartADM2")
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

        if not self.prediction_df.empty:
            df = self.prediction_df
            geocodes = list(df["adm_2"].unique())
        else:
            # TODO: add a better error handling geocode errors
            pass

        return geocodes

    def is_compatible_line_chart_adm_2(self, other: Self) -> bool:
        """
        Compare two Predictions to check if they can be visualized together
        """
        if not self.model.is_compatible(other.model):
            return False

        df = self.prediction_df
        other_df = other.prediction_df

        # TODO: Handle this check with VisualizationError
        if df.empty or other_df.empty:
            return False

        # Check if dataframes have same columns
        if set(df.columns) != set(other_df.columns):
            print(f"{self.id} - {other.id}: different prediction_df columns")
            return False

        geocodes = self.get_geocodes()
        other_geocodes = other.get_geocodes()

        # Check if there's any geocode correlated with other Prediction
        if not any(g in other_geocodes for g in geocodes):
            print(f"{self.id} - {other.id}: different geocodes")
            return False

        return True

    class Meta:
        verbose_name = _("Prediction")
        verbose_name_plural = _("Predictions")
