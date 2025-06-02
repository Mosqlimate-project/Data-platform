import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.core.cache import cache

from .models import ChatSession, Message
from .tasks import generate_bot_answer


User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_key = self.scope["url_route"]["kwargs"]["session_key"]

        if not self.session_key:
            await self.close(code=4000)
            return

        api_key = cache.get(self.session_key, None)

        if api_key:
            username = str(api_key.split(":")[0])
            user = await sync_to_async(User.objects.get)(username=username)
        else:
            user = None

        self.session, _ = await sync_to_async(
            ChatSession.objects.get_or_create
        )(user=user, session_key=self.session_key)

        await self.accept()

        if user:
            messages = await sync_to_async(list)(
                Message.objects.filter(session__user=user).order_by(
                    "timestamp"
                )
            )
        else:
            messages = await sync_to_async(list)(
                Message.objects.filter(session=self.session).order_by(
                    "timestamp"
                )
            )

        for message in messages:
            msg = {"msg": message.content, "source": message.sender}
            await self.send(text_data=json.dumps({"text": msg}))

    async def receive(self, text_data):
        response = json.loads(text_data)
        message = response["text"]

        await self.save_message("user", message)

        await self.send(
            text_data=json.dumps({"text": {"msg": message, "source": "user"}})
        )

        await self.send(
            text_data=json.dumps(
                {"text": {"msg": "waiting", "source": "system"}}
            )
        )

        answer = await self.generate_answer()

        await self.save_message("bot", answer)

        await self.send(
            text_data=json.dumps({"text": {"msg": answer, "source": "bot"}})
        )

    async def chat_message(self, event):
        text = event["text"]
        await self.send(text_data=json.dumps({"text": text}))

    async def save_message(self, sender, content):
        await sync_to_async(Message.objects.create)(
            session=self.session, content=content, sender=sender
        )
        await sync_to_async(self.session.update_activity)()

    async def generate_answer(self):
        asnwer = generate_bot_answer(self.session.pk)
        return asnwer
