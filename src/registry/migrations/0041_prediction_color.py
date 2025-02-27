# Generated by Django 4.2.17 on 2025-01-15 14:30

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0040_alter_predictiondatarow_adm_0"),
    ]

    operations = [
        migrations.AddField(
            model_name="prediction",
            name="color",
            field=models.CharField(
                help_text="Color in hexadecimal format. E.g: #ffffff",
                max_length=7,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Color must be in hexadecimal format, e.g., #ffffff",
                        regex="^#[0-9A-Fa-f]{6}$",
                    )
                ],
            ),
        ),
    ]
