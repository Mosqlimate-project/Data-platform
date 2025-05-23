# Generated by Django 4.2.18 on 2025-01-30 16:11

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0046_alter_prediction_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="prediction",
            name="crps",
            field=models.FloatField(default=None, null=True),
        ),
        migrations.AddField(
            model_name="prediction",
            name="interval_score",
            field=models.FloatField(default=None, null=True),
        ),
        migrations.AddField(
            model_name="prediction",
            name="log_score",
            field=models.FloatField(default=None, null=True),
        ),
        migrations.AddField(
            model_name="prediction",
            name="mae",
            field=models.FloatField(default=None, null=True),
        ),
        migrations.AddField(
            model_name="prediction",
            name="mse",
            field=models.FloatField(default=None, null=True),
        ),
    ]
