from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ChatSession(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="chats"
    )
    session_key = models.CharField(
        unique=True,
        db_index=True,
        null=False,
    )
    start_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Chat Session"
        verbose_name_plural = "Chat Sessions"
        ordering = ["-last_activity"]

    def __str__(self):
        if self.user:
            return f"({self.user.username}) {self.session_key}"
        return f"(Anonymous) {self.session_key} "

    def update_activity(self):
        self.last_activity = timezone.now()
        self.save(update_fields=["last_activity"])


class Message(models.Model):
    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name="messages"
    )
    content = models.TextField()
    sender = models.CharField(
        null=False,
        default="bot",
        choices=[("user", "User"), ("bot", "Bot"), ("system", "System")],
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["timestamp"]

    def __str__(self):
        return f"({self.sender}): {self.content[:10]}..."
