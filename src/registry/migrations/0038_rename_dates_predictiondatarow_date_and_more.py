# Generated by Django 4.2.15 on 2024-08-23 06:39

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0037_remove_prediction_prediction"),
    ]

    operations = [
        migrations.RenameField(
            model_name="predictiondatarow",
            old_name="dates",
            new_name="date",
        ),
        migrations.RenameField(
            model_name="predictiondatarow",
            old_name="preds",
            new_name="pred",
        ),
    ]