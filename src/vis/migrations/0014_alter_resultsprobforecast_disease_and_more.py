# Generated by Django 4.2.16 on 2024-09-25 13:34

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "vis",
            "0013_remove_resultsprobforecast_results_prob_forecast_unique_and_more",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="resultsprobforecast",
            name="disease",
            field=models.CharField(
                choices=[
                    ("dengue", "Dengue"),
                    ("chikungunya", "Chigungunya"),
                    ("zika", "Zika"),
                ],
                default="dengue",
            ),
        ),
        migrations.AlterField(
            model_name="totalcases",
            name="disease",
            field=models.CharField(
                choices=[
                    ("dengue", "Dengue"),
                    ("chikungunya", "Chigungunya"),
                    ("zika", "Zika"),
                ],
                default="dengue",
            ),
        ),
        migrations.AlterField(
            model_name="totalcases100khab",
            name="disease",
            field=models.CharField(
                choices=[
                    ("dengue", "Dengue"),
                    ("chikungunya", "Chigungunya"),
                    ("zika", "Zika"),
                ],
                default="dengue",
            ),
        ),
    ]
