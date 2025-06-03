from django.conf import settings
from celery import shared_task


@shared_task
def generate_bot_answer(question: str):
    from mosqlimate_assistant.assistant import AssistantGemini

    assistant = AssistantGemini(settings.CHATBOT_TOKEN)

    return assistant.query_llm(question)
