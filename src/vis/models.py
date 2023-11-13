from datetime import datetime

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class UFs(models.TextChoices):
    AC = "AC", "Acre"
    AL = "AL", "Alagoas"
    AP = "AP", "Amapá"
    AM = "AM", "Amazonas"
    BA = "BA", "Bahia"
    CE = "CE", "Ceará"
    ES = "ES", "Espírito Santo"
    GO = "GO", "Goiás"
    MA = "MA", "Maranhão"
    MT = "MT", "Mato Grosso"
    MS = "MS", "Mato Grosso do Sul"
    MG = "MG", "Minas Gerais"
    PA = "PA", "Pará"
    PB = "PB", "Paraíba"
    PR = "PR", "Paraná"
    PE = "PE", "Pernambuco"
    PI = "PI", "Piauí"
    RJ = "RJ", "Rio de Janeiro"
    RN = "RN", "Rio Grande do Norte"
    RS = "RS", "Rio Grande do Sul"
    RO = "RO", "Rondônia"
    RR = "RR", "Roraima"
    SC = "SC", "Santa Catarina"
    SP = "SP", "São Paulo"
    SE = "SE", "Sergipe"
    TO = "TO", "Tocantins"
    DF = "DF", "Distrito Federal"


class Diseases(models.TextChoices):
    DENGUE = "dengue", "Dengue"
    CHIK = "chik", "Chigungunya"
    ZIKA = "zika", "Zika"


class TotalCases(models.Model):
    uf = models.CharField(choices=UFs.choices, null=False)
    year = models.PositiveIntegerField(
        null=False,
        validators=[
            MinValueValidator(1980),
            MaxValueValidator(datetime.now().year),
        ],
    )
    disease = models.CharField(
        choices=Diseases.choices, null=False, default="dengue"
    )
    total_cases = models.PositiveIntegerField(null=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["uf", "year", "disease"], name="unique_total_cases"
            )
        ]

    def __str__(self):
        return f"{self.disease} - {self.year} - {self.uf} - {self.total_cases}"


class TotalCases100kHab(models.Model):
    uf = models.CharField(choices=UFs.choices, null=False)
    year = models.PositiveIntegerField(
        null=False,
        validators=[
            MinValueValidator(1980),
            MaxValueValidator(datetime.now().year),
        ],
    )
    disease = models.CharField(
        choices=Diseases.choices, null=False, default="dengue"
    )
    total_cases = models.PositiveIntegerField(null=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["uf", "year", "disease"],
                name="unique_total_cases_100k_hab",
            )
        ]

    def __str__(self):
        return f"{self.disease} - {self.year} - {self.uf} - {self.total_cases}"
