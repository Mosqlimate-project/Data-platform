import json
import logging
import markdown

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache

from .models import ChatSession, Message
from .tasks import generate_bot_answer


User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        accept_language = "en"

        for header, value in self.scope["headers"]:
            if header == b"accept-language":
                accept_language = value.decode()

        self.session_key = self.scope["url_route"]["kwargs"]["session_key"]

        if not self.session_key:
            await self.close(code=4000)
            return

        await self.accept()
        await self.channel_layer.group_add(
            f"chat_{self.session_key}", self.channel_name
        )

        api_key = cache.get(self.session_key, None)

        if api_key:
            username = str(api_key.split(":")[0])
            user = await sync_to_async(User.objects.get)(username=username)
        else:
            user = None

        self.user = user
        self.user_api_key = api_key

        self.session, _ = await sync_to_async(
            ChatSession.objects.get_or_create
        )(user=user, session_key=self.session_key)

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

        if not messages:
            await self.send(
                text_data=json.dumps(
                    {"text": {"msg": "waiting", "source": "system"}}
                )
            )

            await sync_to_async(generate_bot_answer.delay)(
                f"Present yourself in language: {accept_language}",
                self.session_key,
            )

        for message in messages:
            msg = {
                "msg": markdown.markdown(
                    message.content,
                    extensions=["fenced_code", "codehilite"],
                    output_format="xhtml",
                    tab_length=4,
                ),
                "source": message.sender,
            }
            await self.send(text_data=json.dumps({"text": msg}))

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            f"chat_{self.session_key}", self.channel_name
        )

    async def receive(self, text_data):
        response = json.loads(text_data)
        question = response["text"]

        await self.send(
            text_data=json.dumps({"text": {"msg": question, "source": "user"}})
        )

        await self.send(
            text_data=json.dumps(
                {"text": {"msg": "waiting", "source": "system"}}
            )
        )

        await self.save_message("user", question)

        message_history = None

        try:
            if self.user:
                qs = Message.objects.filter(session__user=self.user)
            else:
                qs = Message.objects.filter(session=self.session)

            messages = await sync_to_async(list)(qs.order_by("-timestamp")[:5])
            messages.reverse()

            message_history = [
                {
                    "role": "user" if m.sender == "user" else "assistant",
                    "content": m.content,
                }
                for m in messages
            ]

            await sync_to_async(generate_bot_answer.delay)(
                question, self.session_key, self.user_api_key, message_history
            )

        except Exception as e:
            logger.exception(f"ChatConsumer error: {e}")
            if settings.DEBUG:
                error = e
            else:
                error = (
                    "Sorry, an error has occurred, please reload the page or "
                    "contact the moderation"
                )
            await self.send(text_data=json.dumps({"error": error}))

    async def bot_message(self, event):
        answer = event["message"]
        await self.save_message("bot", answer)
        message = markdown.markdown(
            answer,
            extensions=["fenced_code", "codehilite"],
            output_format="xhtml",
            tab_length=4,
        )
        await self.send(
            text_data=json.dumps({"text": {"msg": message, "source": "bot"}})
        )

    async def save_message(self, sender, content):
        await sync_to_async(Message.objects.create)(
            session=self.session, content=content, sender=sender
        )
        await sync_to_async(self.session.update_activity)()
