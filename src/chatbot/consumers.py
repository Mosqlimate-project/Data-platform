import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer


class ChatConsumer(WebsocketConsumer):
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
                "text": {"msg": f"answer to: {message}", "source": "bot"},
            },
        )

    def chat_message(self, event):
        text = event["text"]
        self.send(text_data=json.dumps({"text": text}))
