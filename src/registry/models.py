from django.conf import settings
from django.db import models


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
    description = models.TextField(max_length=255, null=True, blank=True)
    repository = models.URLField(max_length=150, null=False, blank=False)
    implementation_language = models.CharField(max_length=100, null=False, blank=False)
    type = models.CharField(max_length=100, null=False, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = "Model"
        verbose_name_plural = "Models"


class Prediction(models.Model):
    model = models.ForeignKey(Model, on_delete=models.CASCADE, null=False)
    description = models.TextField(max_length=255, null=True, blank=True)
    commit = models.CharField(max_length=100, null=False, blank=False)
    predict_date = models.DateField()
    prediction = models.JSONField(null=False, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.commit}"  # TODO: Change it

    class Meta:
        verbose_name = "Prediction"
        verbose_name_plural = "Predictions"
