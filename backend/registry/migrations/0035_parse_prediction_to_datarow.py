from django.db import migrations, models
import django.db.models.deletion


def parse_predictions(apps, schema_editor):
    Prediction = apps.get_model("registry", "Prediction")

    for obj in Prediction.objects.all():
        obj.save()


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0034_predictiondatarow"),
    ]

    operations = [
        migrations.RunPython(parse_predictions),
    ]
