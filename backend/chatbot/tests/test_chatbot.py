import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import asyncio

from django.test import SimpleTestCase, TestCase, override_settings

from users.models import CustomUser
from chatbot import routing
from chatbot.models import ChatSession, Message
from chatbot.tasks import generate_bot_answer


IN_MEMORY_LAYER = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


class ChatbotModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="chatbotuser",
            email="chat@test.com",
            password="testpass",
            is_active=True,
        )

    def test_session_str_anonymous(self):
        s = ChatSession.objects.create(session_key="anon-key")
        self.assertIn("(Anonymous)", str(s))

    def test_session_str_with_user(self):
        s = ChatSession.objects.create(session_key="user-key", user=self.user)
        self.assertIn(self.user.username, str(s))

    def test_session_update_activity(self):
        s = ChatSession.objects.create(session_key="act-key")
        s.update_activity()
        s.refresh_from_db()
        self.assertIsNotNone(s.last_activity)

    def test_message_str(self):
        s = ChatSession.objects.create(session_key="msg-key")
        m = Message.objects.create(session=s, content="hello there")
        self.assertIn("hello", str(m))


class ChatbotRoutingTest(TestCase):
    def test_websocket_urlpatterns_present(self):
        self.assertTrue(routing.websocket_urlpatterns)


@override_settings(CHANNEL_LAYERS=IN_MEMORY_LAYER)
class ChatConsumerTest(SimpleTestCase):
    def _make_consumer(self, query=b"", session_key="sk", user=None):
        from chatbot.consumers import ChatConsumer

        c = ChatConsumer()
        c.scope = {
            "query_string": query,
            "url_route": {"kwargs": {"session_key": session_key}},
        }
        c.channel_layer = MagicMock()
        c.channel_layer.group_add = AsyncMock()
        c.channel_layer.group_discard = AsyncMock()
        c.channel_name = "chan"
        c.accept = AsyncMock()
        c.send = AsyncMock()
        c.close = AsyncMock()
        c.user = user
        c.session = MagicMock()
        c.session.language = "en"
        c.session_key = session_key
        c.language = "en"
        c.user_api_key = None
        return c

    def _session(self, created=False):
        s = MagicMock()
        s.language = "en"
        return s, created

    def test_connect_creates_session_and_presents(self):
        session, created = self._session()
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ) as mock_task:
            MockSession.objects.get_or_create.return_value = (session, created)
            MockMessage.objects.filter.return_value.order_by.return_value = []
            c = self._make_consumer()
            asyncio.run(c.connect())
            c.accept.assert_awaited_once()
            mock_task.delay.assert_called_once()

    def test_connect_lang_change_clears_messages(self):
        session, created = self._session()
        session.language = "en"
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch("chatbot.consumers.generate_bot_answer"):
            MockSession.objects.get_or_create.return_value = (session, False)
            c = self._make_consumer(query=b"lang=pt")
            c.session.language = "en"
            asyncio.run(c.connect())
            MockMessage.objects.filter.assert_called()
            session.save.assert_called()

    def test_connect_with_existing_messages_sends_them(self):
        session, created = self._session(created=True)
        msg = MagicMock()
        msg.content = "hi"
        msg.sender = "user"
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch("chatbot.consumers.generate_bot_answer"):
            MockSession.objects.get_or_create.return_value = (session, created)
            MockMessage.objects.filter.return_value.order_by.return_value = [
                msg
            ]
            c = self._make_consumer()
            asyncio.run(c.connect())
            c.send.assert_awaited_once()

    def test_connect_with_user_lists_user_messages(self):
        session, created = self._session()
        user = MagicMock()
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch("chatbot.consumers.generate_bot_answer"):
            MockSession.objects.get_or_create.return_value = (session, created)
            MockMessage.objects.filter.return_value.order_by.return_value = []
            c = self._make_consumer(user=user)
            asyncio.run(c.connect())
            MockMessage.objects.filter.assert_called_once()

    def test_connect_empty_session_key_closes(self):
        from chatbot.consumers import ChatConsumer

        c = ChatConsumer()
        c.scope = {
            "query_string": b"",
            "url_route": {"kwargs": {"session_key": ""}},
        }
        c.channel_layer = MagicMock()
        c.close = AsyncMock()
        asyncio.run(c.connect())
        c.close.assert_awaited_once_with(code=4000)

    def test_disconnect_discards_group(self):
        from chatbot.consumers import ChatConsumer

        c = ChatConsumer()
        c.session_key = "sk"
        c.channel_layer = MagicMock()
        c.channel_layer.group_discard = AsyncMock()
        c.channel_name = "chan"
        asyncio.run(c.disconnect(1000))
        c.channel_layer.group_discard.assert_awaited_once()

    def test_receive_ping_noop(self):
        c = self._make_consumer()
        with patch("chatbot.consumers.generate_bot_answer") as mock_task:
            asyncio.run(c.receive('{"type": "ping"}'))
        mock_task.delay.assert_not_called()

    def test_receive_question_saves_and_dispatches(self):
        c = self._make_consumer(user=None)
        with patch("chatbot.consumers.Message") as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ) as mock_task:
            MockMessage.objects.filter.return_value.order_by.return_value = []
            asyncio.run(c.receive('{"text": "ola"}'))
            mock_task.delay.assert_called_once()

    def test_receive_empty_question_noop(self):
        c = self._make_consumer()
        with patch("chatbot.consumers.generate_bot_answer") as mock_task:
            asyncio.run(c.receive('{"text": ""}'))
        mock_task.delay.assert_not_called()

    def test_receive_invalid_json_raises(self):
        c = self._make_consumer()
        with self.assertRaises(Exception):
            asyncio.run(c.receive("not json"))

    def test_receive_handles_db_error(self):
        c = self._make_consumer(user=None)
        with patch("chatbot.consumers.Message") as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ), patch("chatbot.consumers.logger"):
            MockMessage.objects.filter.side_effect = RuntimeError("boom")
            asyncio.run(c.receive('{"text": "ola"}'))
            c.send.assert_awaited_once()

    @override_settings(DEBUG=True)
    def test_receive_handles_db_error_debug(self):
        c = self._make_consumer(user=None)
        with patch("chatbot.consumers.Message") as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ), patch("chatbot.consumers.logger"):
            MockMessage.objects.filter.side_effect = RuntimeError("boom")
            asyncio.run(c.receive('{"text": "ola"}'))
            c.send.assert_awaited_once()

    def test_connect_resolves_user_from_api_key(self):
        session, created = self._session()
        user = MagicMock()
        user.api_key.return_value = "usr:uuid"
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ), patch(
            "chatbot.consumers.cache"
        ) as MockCache, patch(
            "chatbot.consumers.User"
        ) as MockUser:
            MockCache.get.return_value = "usr:uuid"
            MockUser.objects.get.return_value = user
            MockSession.objects.get_or_create.return_value = (session, created)
            MockMessage.objects.filter.return_value.order_by.return_value = []
            c = self._make_consumer(user=None)
            asyncio.run(c.connect())
            MockUser.objects.get.assert_called_once_with(username="usr")
            self.assertEqual(c.user, user)

    def test_connect_api_key_user_not_found(self):
        session, created = self._session()
        from django.contrib.auth import get_user_model

        UserModel = get_user_model()
        with patch("chatbot.consumers.ChatSession") as MockSession, patch(
            "chatbot.consumers.Message"
        ) as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ), patch(
            "chatbot.consumers.cache"
        ) as MockCache, patch.object(
            UserModel.objects, "get", side_effect=UserModel.DoesNotExist
        ):
            MockCache.get.return_value = "usr:uuid"
            MockSession.objects.get_or_create.return_value = (session, created)
            MockMessage.objects.filter.return_value.order_by.return_value = []
            c = self._make_consumer(user=None)
            asyncio.run(c.connect())
            self.assertIsNone(c.user)

    def test_receive_question_with_user(self):
        user = MagicMock()
        c = self._make_consumer(user=user)
        with patch("chatbot.consumers.Message") as MockMessage, patch(
            "chatbot.consumers.generate_bot_answer"
        ) as mock_task:
            MockMessage.objects.filter.return_value.order_by.return_value = []
            asyncio.run(c.receive('{"text": "ola"}'))
            mock_task.delay.assert_called_once()

    def test_bot_message_saves_and_sends(self):
        c = self._make_consumer()
        with patch("chatbot.consumers.Message"):
            asyncio.run(c.bot_message({"message": "Resposta", "error": False}))
            c.send.assert_awaited_once()


class GenerateBotAnswerTaskTest(TestCase):
    def setUp(self):
        self.session_key = "task-key"

    def _patch_assistant(self, **attrs):
        assistant = SimpleNamespace(**attrs)
        return patch.dict(
            sys.modules,
            {"mosqlimate_assistant": assistant},
        )

    def test_task_success_sends_answer(self):
        with self._patch_assistant(
            main=SimpleNamespace(
                assistant_pipeline=MagicMock(return_value="Resposta")
            )
        ), patch("channels.layers.get_channel_layer") as mock_layer:
            mock_layer.return_value.group_send = AsyncMock()
            generate_bot_answer("pergunta", self.session_key, language="pt")
            mock_layer.return_value.group_send.assert_called_once()
            args = mock_layer.return_value.group_send.call_args[0]
            self.assertEqual(args[1]["error"], False)

    def test_task_error_sends_error_and_raises(self):
        with self._patch_assistant(
            main=SimpleNamespace(
                assistant_pipeline=MagicMock(side_effect=RuntimeError("boom"))
            )
        ), patch(
            "channels.layers.get_channel_layer"
        ) as mock_layer, self.assertRaises(
            RuntimeError
        ):
            mock_layer.return_value.group_send = AsyncMock()
            generate_bot_answer("pergunta", self.session_key, language="pt")
            args = mock_layer.return_value.group_send.call_args[0]
            self.assertEqual(args[1]["error"], True)

    def test_task_with_message_history(self):
        with self._patch_assistant(
            main=SimpleNamespace(
                assistant_pipeline=MagicMock(return_value="ok")
            )
        ), patch("channels.layers.get_channel_layer") as mock_layer:
            mock_layer.return_value.group_send = AsyncMock()
            generate_bot_answer(
                "q",
                self.session_key,
                message_history=[{"role": "user", "content": "hi"}],
            )
            self.assertTrue(mock_layer.return_value.group_send.called)
