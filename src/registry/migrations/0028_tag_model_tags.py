# Generated by Django 4.2.13 on 2024-05-23 22:20

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "registry",
            "0027_prediction_adm_0_geocode_prediction_adm_1_geocode_and_more",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="Tag",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=30, unique=True)),
                (
                    "color",
                    models.CharField(
                        help_text="Color in hexadecimal format. E.g: #ffffff",
                        max_length=7,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Color must be in hexadecimal format, e.g., #ffffff",
                                regex="^#[0-9A-Fa-f]{6}$",
                            )
                        ],
                    ),
                ),
                ("active", models.BooleanField(default=False)),
            ],
        ),
        migrations.AddField(
            model_name="model",
            name="tags",
            field=models.ManyToManyField(
                related_name="tags", to="registry.tag"
            ),
        ),
    ]
