from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0011_customuser_rate_limit"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="sdk_key",
            field=models.UUIDField(blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="sdk_key_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
