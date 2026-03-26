from django.db import migrations, models
import django.db.models.deletion


def move_down_disease_adm_level(apps, schema_editor):
    ModelPrediction = apps.get_model("registry", "ModelPrediction")
    for pred in ModelPrediction.objects.all():
        pred.disease = pred.model.disease
        pred.adm_level = pred.model.adm_level
        pred.save()


class Migration(migrations.Migration):

    dependencies = [
        ("registry", "0078_remove_modelprediction_predict_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="modelprediction",
            name="disease",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="predictions",
                to="datastore.disease",
            ),
        ),
        migrations.AddField(
            model_name="modelprediction",
            name="adm_level",
            field=models.IntegerField(
                null=True,
                choices=[
                    (0, "National"),
                    (1, "State"),
                    (2, "Municipality"),
                    (3, "Sub Municipality"),
                ],
            ),
        ),
        migrations.RunPython(
            move_down_disease_adm_level, reverse_code=migrations.RunPython.noop
        ),
        migrations.AlterField(
            model_name="modelprediction",
            name="disease",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="predictions",
                to="datastore.disease",
            ),
        ),
        migrations.AlterField(
            model_name="modelprediction",
            name="adm_level",
            field=models.IntegerField(
                choices=[
                    (0, "National"),
                    (1, "State"),
                    (2, "Municipality"),
                    (3, "Sub Municipality"),
                ]
            ),
        ),
        migrations.RemoveField(
            model_name="repositorymodel",
            name="disease",
        ),
        migrations.RemoveField(
            model_name="repositorymodel",
            name="adm_level",
        ),
    ]
