from django.shortcuts import render
from django.views.generic import TemplateView


class ChatView(TemplateView):
    template_name: str = "chatbot/chat.html"

    def get(self, request, *args, **kwargs):
        if not request.session.session_key:
            request.session.create()
            request.session["initialized"] = True

        context = {
            "session_key": request.session.session_key,
            "user_id": (
                request.user.id if request.user.is_authenticated else None
            ),
        }

        return render(request, self.template_name, context=context)
