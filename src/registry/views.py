import json

from django.views import View
from django.shortcuts import render, get_object_or_404
from django.core.serializers.json import DjangoJSONEncoder

from registry.models import Model, Prediction, Tag
from vis.api import get_cases
from vis.schema import HistoricoAlertaCasesIn


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


class PredictionView(View):
    template_name = "registry/prediction.html"

    def get(self, request, prediction_id: int):
        prediction: Prediction = get_object_or_404(
            Prediction, pk=prediction_id
        )
        data = list(prediction.data.values())
        tags = [
            Tag.objects.get(pk=id)
            for id in Tag.get_tag_ids_from_model_id(prediction.model.id)
        ]
        payload = HistoricoAlertaCasesIn(
            sprint=prediction.model.sprint,
            disease=prediction.model.disease,
            start=prediction.date_ini_prediction.date(),
            end=prediction.date_end_prediction.date(),
            adm_level=prediction.model.adm_level,
            adm_1=prediction.adm_1.uf if prediction.adm_1 else None,
            adm_2=prediction.adm_2.geocode if prediction.adm_2 else None,
        )
        cases = get_cases(request, payload)

        context = {
            "prediction": prediction,
            "tags": tags,
            "data": json.dumps(data, cls=DjangoJSONEncoder),
            "cases": cases,
        }
        return render(request, self.template_name, context)
