import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.auth import get_user_model
from django.core.cache import cache

from .models import ChatSession


User = get_user_model()


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.session_key = self.scope["url_route"]["kwargs"]["session_key"]
        api_key = cache.get(self.session_key, None)

        if api_key:
            username = str(api_key.split(":")[0])
            user = User.objects.get(username=username)
        else:
            user = None

        if not self.session_key:
            self.close(code=4000)
            return

        self.session, _ = ChatSession.objects.get_or_create(
            user=user, session_key=self.session_key
        )

        self.accept()

    def receive(self, text_data):
        response = json.loads(text_data)
        message = response["text"]

        async_to_sync(self.channel_layer.send)(
            self.channel_name,
            {
                "type": "chat_message",
                "text": {"msg": message, "source": "user"},
            },
        )

        async_to_sync(self.channel_layer.send)(
            self.channel_name,
            {
                "type": "chat.message",
                "text": {
                    "msg": f"session {self.session.pk} \n user: {self.session.user}",
                    "source": "bot",
                },
            },
        )

    def chat_message(self, event):
        text = event["text"]
        self.send(text_data=json.dumps({"text": text}))
