from django.db import migrations, models


def create_initial_objects(apps, schema_editor):
    ImplementationLanguage = apps.get_model(
        "registry", "ImplementationLanguage"
    )

    ImplementationLanguage.objects.get_or_create(
        language="MatLab", svg_path="matlab.svg"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("registry", "0035_parse_prediction_to_datarow"),
    ]

    operations = [migrations.RunPython(create_initial_objects)]
