from django.db import migrations


def migrate_allauth_github_accounts(apps, schema_editor):
    OAuthAccount = apps.get_model("users", "OAuthAccount")
    User = apps.get_model("users", "CustomUser")

    from allauth.socialaccount.models import SocialAccount

    for account in SocialAccount.objects.filter(provider="github"):
        try:
            user = User.objects.get(id=account.user_id)
            OAuthAccount.objects.get_or_create(
                user=user,
                provider="github",
                provider_id=account.uid,
                defaults={
                    "raw_info": account.extra_data or {},
                },
            )
        except User.DoesNotExist:
            continue


def reverse_migration(apps, schema_editor):
    OAuthAccount = apps.get_model("users", "OAuthAccount")
    OAuthAccount.objects.filter(provider="github").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_customuser_avatar_customuser_avatar_url_and_more"),
        ("socialaccount", "__latest__"),
    ]

    operations = [
        migrations.RunPython(
            migrate_allauth_github_accounts,
            reverse_migration,
        ),
    ]
