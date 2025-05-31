import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction

from .models import ChatSession, Message


User = get_user_model()


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.session_key = self.scope["url_route"]["kwargs"]["session_key"]

        if not self.session_key:
            self.close(code=4000)
            return

        api_key = cache.get(self.session_key, None)

        if api_key:
            username = str(api_key.split(":")[0])
            user = User.objects.get(username=username)
        else:
            user = None

        self.session, _ = ChatSession.objects.get_or_create(
            user=user, session_key=self.session_key
        )

        self.accept()

        messages: list[Message] = Message.objects.filter(
            session=self.session
        ).order_by("timestamp")
        print(messages)

        for message in messages:
            print(message)
            msg = {"msg": message.content, "source": message.sender}
            self.send(text_data=json.dumps({"text": msg}))

    def receive(self, text_data):
        response = json.loads(text_data)
        message = response["text"]

        with transaction.atomic():
            Message.objects.create(
                session=self.session, content=message, sender="user"
            )
            self.session.update_activity()

        async_to_sync(self.channel_layer.send)(
            self.channel_name,
            {
                "type": "chat.message",
                "text": {"msg": message, "source": "user"},
            },
        )

        answer = f"session {self.session.pk} user: {self.session.user}"

        with transaction.atomic():
            Message.objects.create(
                session=self.session, content=answer, sender="bot"
            )
            self.session.update_activity()

        async_to_sync(self.channel_layer.send)(
            self.channel_name,
            {
                "type": "chat.message",
                "text": {
                    "msg": answer,
                    "source": "bot",
                },
            },
        )

    def chat_message(self, event):
        text = event["text"]
        self.send(text_data=json.dumps({"text": text}))
