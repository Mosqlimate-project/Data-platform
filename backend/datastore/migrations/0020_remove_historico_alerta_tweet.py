from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("datastore", "0019_copernicusbrasilprecipfixed"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="historicoalerta",
            name="tweet",
        ),
        migrations.RemoveField(
            model_name="historicoalertachik",
            name="tweet",
        ),
        migrations.RemoveField(
            model_name="historicoalertazika",
            name="tweet",
        ),
        migrations.RunSQL(
            sql=[
                'ALTER TABLE IF EXISTS "Historico_alerta" '
                'DROP COLUMN IF EXISTS "tweet"',
                'ALTER TABLE IF EXISTS "Historico_alerta_chik" '
                'DROP COLUMN IF EXISTS "tweet"',
                'ALTER TABLE IF EXISTS "Historico_alerta_zika" '
                'DROP COLUMN IF EXISTS "tweet"',
            ],
            reverse_sql=[
                'ALTER TABLE IF EXISTS "Historico_alerta" '
                'ADD COLUMN IF NOT EXISTS "tweet" numeric(5,0)',
                'ALTER TABLE IF EXISTS "Historico_alerta_chik" '
                'ADD COLUMN IF NOT EXISTS "tweet" numeric(5,0)',
                'ALTER TABLE IF EXISTS "Historico_alerta_zika" '
                'ADD COLUMN IF NOT EXISTS "tweet" numeric(5,0)',
            ],
        ),
    ]
