import uuid
from typing import Any, Literal

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.signals import request_started
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError(_("The Email must be set"))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not extra_fields.get("is_staff"):
            raise ValueError(_("Superuser must have is_staff=True."))
        if not extra_fields.get("is_superuser"):
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)  # type: ignore[var-annotated]
    name = models.CharField(max_length=255, blank=True, null=True)  # type: ignore[var-annotated]
    homepage = models.URLField(max_length=255, null=True)  # type: ignore[var-annotated]
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)  # type: ignore[var-annotated]
    expires_at = models.DateTimeField(null=True, blank=True)  # type: ignore[var-annotated]
    created_ip = models.GenericIPAddressField(null=True, blank=True)  # type: ignore[var-annotated]
    rate_limit = models.CharField(max_length=20, default="10/s")  # type: ignore[var-annotated]

    def set_rate_limit(self, value: int, unit: Literal["s", "m", "d"]):
        units = {"s", "m", "d"}  # second, minute, day

        if unit not in units:
            raise ValueError("Unit must be (s)econd, (m)inute, or (d)ay.")

        if not isinstance(value, int) or value < 0:
            raise ValueError("Value must be a positive integer.")

        self.rate_limit = f"{value}/{unit}"
        self.save(update_fields=["rate_limit"])

    def save(self, *args, **kwargs):
        # To change User name, change first_name and last_name
        self.name = self.get_full_name()
        super().save(*args, **kwargs)

    def api_key(self):
        return f"{self.username}:{self.uuid}"

    def refresh_api_key(self):
        self.uuid = uuid.uuid4()
        self.save()

    def get_avatar(self):
        if self.avatar:
            return self.avatar.url
        if self.avatar_url:
            return self.avatar_url

    objects: Any = CustomUserManager()  # type: ignore[misc]  # type: ignore[misc]


@receiver(request_started)
def delete_expired_users(sender, **kwargs):
    CustomUser.objects.filter(expires_at__lt=timezone.now()).delete()


class OAuthAccount(models.Model):
    class Providers(models.TextChoices):
        GOOGLE = "google", "Google"
        GITHUB = "github", "GitHub"
        GITLAB = "gitlab", "GitLab"

    user = models.ForeignKey(  # type: ignore[var-annotated]
        CustomUser, on_delete=models.CASCADE, related_name="oauth_accounts"
    )
    provider = models.CharField(max_length=20, choices=Providers.choices)  # type: ignore[var-annotated]
    provider_id = models.CharField(max_length=255)  # type: ignore[var-annotated]
    raw_info = models.JSONField()
    access_token = models.TextField(null=True, blank=True)  # type: ignore[var-annotated]
    refresh_token = models.TextField(null=True, blank=True)  # type: ignore[var-annotated]
    access_token_expires_at = models.DateTimeField(null=True, blank=True)  # type: ignore[var-annotated]
    installation_id = models.CharField(max_length=255, null=True, blank=True)  # type: ignore[var-annotated]
    installation_access_token = models.TextField(null=True, blank=True)  # type: ignore[var-annotated]
    installation_token_expires_at = models.DateTimeField(null=True, blank=True)  # type: ignore[var-annotated]
    installation_metadata = models.JSONField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)  # type: ignore[var-annotated]
    updated = models.DateTimeField(auto_now=True)  # type: ignore[var-annotated]

    def __str__(self):
        return self.provider

    class Meta:
        unique_together = ("provider", "provider_id")
