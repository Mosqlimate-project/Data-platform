from celery import shared_task


@shared_task
def generate_bot_answer(question: str):
    from mosqlimate_assistant import main

    return main.assistant_pipeline(question, 3)
