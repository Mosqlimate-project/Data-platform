from django.views import View
from django.shortcuts import render, get_object_or_404

from registry.models import Model, Tag


class ModelView(View):
    template_name = "registry/model.html"

    def get(self, request, model_id: int):
        model = get_object_or_404(Model, pk=model_id)
        tags = [
            Tag.objects.get(pk=id)
            for id in Tag.get_tag_ids_from_model_id(model_id)
        ]

        context = {"model": model, "tags": tags}
        return render(request, self.template_name, context)
