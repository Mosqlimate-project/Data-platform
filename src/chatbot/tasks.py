from celery import shared_task
from typing import Optional


@shared_task
def generate_bot_answer(
    question: str,
    session_key: str,
    user_api_key: Optional[str] = None,
    message_history: Optional[dict] = None,
):
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    try:
        from mosqlimate_assistant import main

        answer = main.assistant_pipeline(
            question, 3, x_uid=user_api_key, message_history=message_history
        )
    except Exception as err:
        async_to_sync(channel_layer.group_send)(
            f"chat_{session_key}",
            {
                "type": "bot_message",
                "message": err,
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
