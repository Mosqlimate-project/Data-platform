import io
import json

from django.http import (
    JsonResponse,
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseBadRequest,
    Http404,
)
from django.views import View
from django.conf import settings
from django.shortcuts import render, get_object_or_404
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_POST
from django.views.decorators.cache import never_cache

from registry.models import Model, Prediction, Tag
from vis.api import get_cases
from vis.schema import HistoricoAlertaCasesIn


class ModelView(View):
    template_name = "registry/model.html"

    @method_decorator(never_cache)
    def get(self, request, model_id: int):
        model: Model = get_object_or_404(Model, pk=model_id)
        tags = [
            Tag.objects.get(pk=id)
            for id in Tag.get_tag_ids_from_model_id(model_id)
        ]

        predictions = model.predictions.all()

        if request.user != model.author.user:
            predictions = predictions.filter(published=True)

        predictions = predictions.order_by("-updated")

        predict_res = []
        for p in predictions:
            p_res = {}
            p_res["id"] = p.id
            p_res["published"] = p.published
            p_res["description"] = p.description
            p_res["adm_1"] = p.adm_1.uf if p.adm_1 else p.adm_2.state.uf
            p_res["adm_2"] = p.adm_2.name if p.adm_2 else None
            p_res["start_date"] = str(p.date_ini_prediction.date())
            p_res["end_date"] = str(p.date_end_prediction.date())
            p_res["scores"] = p.scores
            p_res["color"] = p.color
            p_res["created"] = str(p.created.date())
            predict_res.append(p_res)

        context = {
            "model": model,
            "tags": tags,
            "predictions": json.dumps(predict_res),
        }
        return render(request, self.template_name, context)


class PredictionView(View):
    template_name = "registry/prediction.html"

    def get(self, request, prediction_id: int):
        prediction: Prediction = get_object_or_404(
            Prediction, pk=prediction_id
        )

        if request.user != prediction.model.author.user:
            if not prediction.published and not settings.DEBUG:
                raise Http404()

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
        cases = [c.model_dump() for c in get_cases(request, payload)]

        df = prediction.to_dataframe()
        df = df.fillna("-").applymap(
            lambda x: round(x, 2) if isinstance(x, float) else x
        )
        table = df.to_html(
            classes="table table-bordered", index=False, border=0
        ).replace("<td>", '<td style="white-space: nowrap; width: 1%;">')

        context = {
            "prediction": prediction,
            "color": prediction.color,
            "tags": tags,
            "data": json.dumps(data, cls=DjangoJSONEncoder),
            "cases": json.dumps(cases, cls=DjangoJSONEncoder),
            "table": table,
        }
        return render(request, self.template_name, context)


def prediction_download_csv(request, prediction_id: int):
    prediction: Prediction = get_object_or_404(Prediction, pk=prediction_id)
    df = prediction.to_dataframe()
    buffer = io.StringIO()
    df.to_csv(buffer, index=True)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type="text/csv")
    response["Content-Disposition"] = (
        f'attachment; filename="Prediction{prediction.id}.csv"'
    )
    return response


@require_POST
def prediction_update_published(request, prediction_id: int):
    prediction = get_object_or_404(Prediction, pk=prediction_id)

    if request.user != prediction.model.author.user:
        return HttpResponseForbidden("Forbidden")

    try:
        data = json.loads(request.body)
        published = data.get("published")

        if not isinstance(published, bool):
            return HttpResponseBadRequest("Invalid request")

        prediction.published = published
        prediction.save()

        return JsonResponse({"status": "success"})

    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid Request")
