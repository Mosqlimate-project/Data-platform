from django import template
from django.template.loader import render_to_string

register = template.Library()


@register.simple_tag
def chatbot(session_key):
    return render_to_string(
        "chatbot/components/chat.html", {"session_key": session_key}
    )
