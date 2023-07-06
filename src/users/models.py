import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver

from registry.models import Author


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
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        # To change User name, change first_name and last_name
        self.name = self.get_full_name()
        super().save(*args, **kwargs)

    def get_fullname(self):
        return f"{self.first_name} {self.last_name}"

    objects = CustomUserManager()


@receiver(post_save, sender=CustomUser)
def create_author(sender, instance, created, **kwargs):
    """Creates Author when User is created"""
    if created:
        Author.objects.create(user=instance)
