import os
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def get_plangs_path() -> str:
    return os.path.join(settings.STATIC_ROOT, "img/plangs")


class ImplementationLanguage(models.Model):
    language = models.CharField(max_length=100, null=False, blank=False, unique=True)
    svg_path = models.FilePathField(path=get_plangs_path(), match=".svg$", null=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.language}"

    class Meta:
        verbose_name = "Implementation Language"
        verbose_name_plural = "Implementation Languages"


class Author(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=False, blank=False
    )
    institution = models.CharField(max_length=100, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name}"

    class Meta:
        verbose_name = "Author"
        verbose_name_plural = "Authors"


class Model(models.Model):
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, null=False, blank=False
    )
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    repository = models.CharField(max_length=100, null=False, blank=False)
    implementation_language = models.ForeignKey(
        ImplementationLanguage, on_delete=models.PROTECT, null=False, blank=False
    )
    type = models.CharField(max_length=100, null=False, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = "Model"
        verbose_name_plural = "Models"


class Prediction(models.Model):
    class ADM_levels(models.IntegerChoices):
        NATIONAL = 0, _("National")
        STATE = 1, _("State")
        MUNICIPALITY = 2, _("Municipality")
        SUB_MUNICIPALITY = 3, _("Sub Municipality")

    model = models.ForeignKey(Model, on_delete=models.CASCADE, null=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    commit = models.CharField(max_length=100, null=False, blank=False)
    predict_date = models.DateField()
    prediction = models.JSONField(null=False, blank=True)
    ADM_level = models.IntegerField(
        choices=ADM_levels.choices, null=True
    )  # TODO: Change to false
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.commit}"  # TODO: Change it

    class Meta:
        verbose_name = "Prediction"
        verbose_name_plural = "Predictions"
