import os
import json
from pathlib import Path
from collections import defaultdict
from hashlib import blake2b

from dateutil import parser

from django.conf import settings
from django.db import models
from django.http import JsonResponse, FileResponse
from django.shortcuts import render
from django.views import View
from django.views.decorators.cache import cache_page
from django.views.decorators.clickjacking import xframe_options_exempt

# from epiweeks import Week
from registry.models import Model, Prediction, Tag
from .models import UFs, Macroregion, GeoMacroSaude, ResultsProbForecast
from .brasil.models import State, City
from .plots.forecast_map import macro_forecast_map_table
from .dash.line_chart import hist_alerta_data


def is_null(val) -> bool:
    return str(val).upper() in ["", "NONE", "NULL", "UNDEFINED"]


def check_adm_level(adm_level, adm_1, adm_2) -> JsonResponse | None:
    if str(adm_level) == "1":
        if is_null(adm_1):
            return JsonResponse({"error": "adm_1 is required"}, status=422)
        return None

    if str(adm_level) == "2":
        if is_null(adm_2):
            return JsonResponse({"error": "adm_2 is required"}, status=422)
        return None

    return JsonResponse(
        {"error": f"incorrect value for adm_level: {adm_level}"},
        status=422,
    )


def get_distinct_values(field: str, sprint: bool) -> list:
    return sorted(
        list(
            Prediction.objects.filter(model__sprint=sprint)
            .values_list(field, flat=True)
            .distinct()
        )
    )


class PredictionsDashboard(View):
    template_name = "vis/dashboard/predictions.html"

    def get(self, request):
        dashboard = request.GET.get("dashboard", "predictions")
        sprint = dashboard == "sprint"
        context = {}

        all_tags = set(
            Tag.objects.filter(model_tags__sprint=sprint).distinct()
        )
        all_tags |= set(
            Tag.objects.filter(
                prediction_tags__model__sprint=sprint
            ).distinct()
        )

        window = Prediction.objects.filter(model__sprint=sprint).aggregate(
            start=models.Min("date_ini_prediction"),
            end=models.Max("date_end_prediction"),
        )

        tags = {}
        for tag in all_tags:
            if tag.group not in ["disease", "adm_level", "time_resolution"]:
                # TODO: enable non-unique tag groups to be used
                continue

            tags[f"{tag.id}"] = {
                "name": tag.name,
                "color": tag.color,
                "group": tag.group,
            }

        context["tags"] = json.dumps(tags)
        context["dashboard"] = dashboard
        context["min_window_date"] = str(window["start"].date())
        context["max_window_date"] = str(window["end"].date())

        return render(request, self.template_name, context)


@cache_page(60 * 20)
def get_hist_alerta_data(request) -> JsonResponse:
    sprint = request.GET.get("dashboard", "predictions") == "sprint"
    disease = request.GET.get("disease", "dengue")
    adm_level = request.GET.get("adm-level", None)
    adm_1 = request.GET.get("adm-1", None)
    adm_2 = request.GET.get("adm-2", None)

    if not adm_level:
        return JsonResponse({}, status=400)

    if (adm_level == "1" and not adm_1) or (adm_level == "2" and not adm_2):
        return JsonResponse({}, status=400)

    window = Prediction.objects.filter(model__sprint=sprint).aggregate(
        start=models.Min("date_ini_prediction"),
        end=models.Max("date_end_prediction"),
    )

    try:
        hist_alerta = hist_alerta_data(
            sprint=sprint,
            disease=disease,
            start_window_date=window["start"],
            end_window_date=window["end"],
            adm_level=adm_level,
            adm_1=adm_1,
            adm_2=adm_2,
        )
    except Exception:
        return JsonResponse({}, status=400)

    res = hist_alerta.set_index("date")["target"].to_dict()
    res = {str(k.date()): int(v) for k, v in res.items()}
    return JsonResponse(res)


@cache_page(60 * 120, key_prefix="get_models")
def get_models(request) -> JsonResponse:
    sprint = request.GET.get("dashboard", "predictions") == "sprint"
    models = Model.objects.filter(sprint=sprint).order_by("-updated")
    context = {}

    res = []
    for model in models:
        if not model.predictions.all():
            continue
        model_res = {}
        model_res["id"] = model.id
        model_res["author"] = model.author.user.name
        model_res["disease"] = model.disease
        model_res["adm_level"] = model.ADM_level
        model_res["time_resolution"] = model.time_resolution
        model_res["tags"] = list(model.tags.all().values_list("id", flat=True))
        model_res["description"] = model.description
        res.append(model_res)

    context["items"] = res
    return JsonResponse(context)


@cache_page(60 * 120, key_prefix="get_predictions")
# @never_cache
def get_predictions(request) -> JsonResponse:
    model_ids = request.GET.getlist("model_id")

    if not model_ids:
        return JsonResponse({"items": []}, status=204)

    predictions = Prediction.objects.filter(model__id__in=model_ids).distinct()
    context = {}
    res = []

    for p in predictions:
        df = p.to_dataframe()
        chart = {
            "labels": df["date"].tolist(),
            "data": list(map(round, df["pred"].tolist())),
            "upper": list(map(round, df["upper"].tolist())),
            "lower": list(map(round, df["lower"].tolist())),
        }

        p_res = {}
        p_res["id"] = p.id
        # p_res["description"] = p.description
        p_res["adm_1"] = p.adm_1_geocode
        p_res["adm_2"] = p.adm_2_geocode
        p_res["start_date"] = p.date_ini_prediction
        p_res["end_date"] = p.date_end_prediction
        p_res["tags"] = list(p.tags.all().values_list("id", flat=True))
        p_res["chart"] = chart
        p_res["color"] = p.color
        res.append(p_res)

    context["items"] = res
    return JsonResponse(context)


@cache_page(60 * 120)
def get_adm_names(request):
    adm_level = request.GET.get("adm_level")
    geocodes = request.GET.getlist("geocode")

    res = {}
    if str(adm_level) == "1":
        states = State.objects.filter(geocode__in=geocodes)
        for uf in states:
            res[uf.geocode] = uf.name

    if str(adm_level) == "2":
        cities = City.objects.filter(geocode__in=geocodes)
        for mun in cities:
            res[mun.geocode] = mun.name

    return JsonResponse(res)


#


class DashboardForecastMacroView(View):
    template_name = "vis/dashboard-forecast-map.html"

    @xframe_options_exempt
    def get(self, request):
        context = {}

        dates_by_disease = defaultdict(list)

        for res in ResultsProbForecast.objects.values(
            "disease", "date"
        ).distinct():
            dates_by_disease[res["disease"]].append(str(res["date"]))

        context["dates_by_disease"] = dict(dates_by_disease)

        context["macroregions"] = list(
            Macroregion.objects.values_list("geocode", "name")
        )

        context["ufs"] = UFs.choices

        context["macros_saude"] = list(
            GeoMacroSaude.objects.values_list(
                "geocode", "name", "state__uf"
            ).order_by("geocode")
        )

        return render(request, self.template_name, context)


class MacroForecastMap(View):
    def get(self, request):
        disease = request.GET.get("disease")
        date = request.GET.get("date")
        macroregion = request.GET.get("macroregion", None)
        uf = request.GET.get("uf", None)
        geocodes = request.GET.getlist("geocode", [])

        date = parser.parse(date).date()
        unique_flag: str = ""
        params: dict = {"disease": disease, "date": date, "request": request}

        if geocodes:
            geocodes = sorted(list(map(str, geocodes)))
            unified_geocodes = "".join(geocodes).encode()
            unique_flag = blake2b(unified_geocodes, digest_size=10).hexdigest()
            params |= {"geocodes": geocodes}

        if uf:
            uf = str(uf).upper()
            unique_flag = uf
            params |= {"uf": uf}

        if macroregion:
            macroregion = str(macroregion)
            macros = {
                "1": "norte",
                "2": "nordeste",
                "3": "centrooeste",
                "4": "sudeste",
                "5": "sul",
            }
            unique_flag = macros[macroregion]
            params |= {"macroregion": macroregion}

        if unique_flag:
            html_name = disease + "-" + str(date) + "-" + unique_flag + ".html"
        else:
            html_name = disease + "-" + str(date) + ".html"

        macro_html_dir = Path(
            os.path.join(settings.STATIC_ROOT, "vis/brasil/geomacrosaude")
        )

        if not macro_html_dir.exists():
            macro_html_dir.mkdir(parents=True, exist_ok=True)

        macro_html_file = macro_html_dir / html_name

        if macro_html_file.exists():
            return FileResponse(
                open(macro_html_file, "rb"), content_type="text/html"
            )

        macro_map = macro_forecast_map_table(**params)

        macro_map.save(str(macro_html_file), "html")

        return FileResponse(
            open(macro_html_file, "rb"), content_type="text/html"
        )
