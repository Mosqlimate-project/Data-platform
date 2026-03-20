import json
import logging

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
        query_params = self.scope.get("query_string", b"").decode()
        current_lang = "en"
        if query_params:
            try:
                params = dict(
                    x.split("=") for x in query_params.split("&") if "=" in x
                )
                current_lang = params.get("lang", "en")
            except Exception:
                pass

        self.language = current_lang
        self.session_key = self.scope["url_route"]["kwargs"]["session_key"]

        if not self.session_key:
            await self.close(code=4000)
            return

        await self.accept()
        await self.channel_layer.group_add(
            f"chat_{self.session_key}", self.channel_name
        )

        api_key = cache.get(self.session_key, None)
        user = None

        if api_key:
            try:
                username = str(api_key.split(":")[0])
                user = await sync_to_async(User.objects.get)(username=username)
            except User.DoesNotExist:
                user = None

        self.user = user
        self.user_api_key = api_key

        self.session, created = await sync_to_async(
            ChatSession.objects.get_or_create
        )(
            session_key=self.session_key,
            defaults={"user": user, "language": self.language},
        )

        if not created and self.session.language != self.language:
            await sync_to_async(
                Message.objects.filter(session=self.session).delete
            )()
            self.session.language = self.language
            await sync_to_async(self.session.save)(update_fields=["language"])

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
            generate_bot_answer.delay(
                f"Present yourself in language: {self.language}",
                self.session_key,
                language=self.language,
            )

        for message in messages:
            msg = {
                "msg": message.content,
                "source": message.sender,
            }
            await self.send(text_data=json.dumps({"text": msg}))

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            f"chat_{self.session_key}", self.channel_name
        )

    async def receive(self, text_data):
        response = json.loads(text_data)

        if response.get("type") == "ping":
            return

        question = response["text"]

        if not question:
            return

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

            generate_bot_answer.delay(
                question,
                self.session_key,
                self.user_api_key,
                message_history,
                language=self.language,
            )

        except Exception as e:
            logger.exception(f"ChatConsumer error: {e}")
            if settings.DEBUG:
                error = str(e)
            else:
                error = (
                    "Sorry, an error has occurred, please reload the page or "
                    "contact the moderation"
                )
            await self.send(text_data=json.dumps({"error": error}))

    async def bot_message(self, event):
        answer = event["message"]
        await self.save_message("bot", answer)

        await self.send(
            text_data=json.dumps({"text": {"msg": answer, "source": "bot"}})
        )

    async def save_message(self, sender, content):
        await sync_to_async(Message.objects.create)(
            session=self.session, content=content, sender=sender
        )
        await sync_to_async(self.session.update_activity)()
