from celery import shared_task
from typing import Optional, List, Dict
from types import SimpleNamespace


@shared_task
def generate_bot_answer(
    question: str,
    session_key: str,
    user_api_key: Optional[str] = None,
    message_history: Optional[List[Dict]] = None,
    language: str = "en",
):
    import os
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    google_api_key = os.getenv("GOOGLE_API_KEY", None)
    channel_layer = get_channel_layer()

    try:
        from mosqlimate_assistant import main

        history_objects = None
        if message_history:
            history_objects = [
                SimpleNamespace(role=m["role"], content=m["content"])
                for m in message_history
            ]

        full_question = f"[Language: {language}] {question}"

        answer = main.assistant_pipeline(
            question=full_question,
            google_api_key=google_api_key,
            message_history=history_objects,
            lang=language,
        )
    except Exception as err:
        async_to_sync(channel_layer.group_send)(
            f"chat_{session_key}",
            {
                "type": "bot_message",
                "message": str(err),
                "error": True,
            },
        )
        raise

    async_to_sync(channel_layer.group_send)(
        f"chat_{session_key}",
        {
            "type": "bot_message",
            "message": answer,
            "error": False,
        },
    )
