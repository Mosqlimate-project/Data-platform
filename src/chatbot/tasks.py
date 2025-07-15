from celery import shared_task


@shared_task
def generate_bot_answer(question: str, session_key: str):
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    try:
        from mosqlimate_assistant import main

        answer = main.assistant_pipeline(question, 3)
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
