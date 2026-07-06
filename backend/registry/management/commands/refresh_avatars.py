import httpx
from django.core.management.base import BaseCommand
from django.db import transaction
from registry import models as m


class Command(BaseCommand):
    help = "Iterates over all repository models and syncs owner avatar URLs from Git providers"

    def handle(self, *args, **options):
        models = m.RepositoryModel.objects.select_related(
            "repository", "repository__owner", "repository__organization"
        ).all()

        total = models.count()
        self.stdout.write(f"Found {total} models to check...")

        updated_count = 0

        with httpx.Client(timeout=5.0) as client:
            for idx, model in enumerate(models, 1):
                repo = model.repository
                provider = repo.provider.lower()

                if repo.organization:
                    owner_name = repo.organization.name
                    target_obj = repo.organization
                elif repo.owner:
                    owner_name = repo.owner.username
                    target_obj = repo.owner
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[{idx}/{total}] Skipping model {model.id}: No owner or org mapped."
                        )
                    )
                    continue

                target_avatar_url = None

                try:
                    if provider == "github":
                        url = f"https://api.github.com/users/{owner_name}"
                        res = client.get(url)
                        if res.status_code == 200:
                            target_avatar_url = res.json().get("avatar_url")

                    elif provider == "gitlab":
                        url = f"https://gitlab.com/api/v4/namespaces/{owner_name}"
                        res = client.get(url)
                        if res.status_code == 200:
                            target_avatar_url = res.json().get("avatar_url")

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{idx}/{total}] Connection failed for {owner_name}: {str(e)}"
                        )
                    )
                    continue

                if target_avatar_url:
                    with transaction.atomic():
                        target_obj.avatar = None
                        target_obj.avatar_url = target_avatar_url
                        target_obj.save(update_fields=["avatar", "avatar_url"])

                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"[{idx}/{total}] Updated avatar for {owner_name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[{idx}/{total}] Could not resolve avatar for {owner_name}"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finished. Successfully synced {updated_count} profiles."
            )
        )
