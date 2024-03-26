import os
import json
import datetime
import numpy as np
import altair as alt
import geopandas as gpd
from typing import Union
from itertools import cycle

from django.shortcuts import render, get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.http import JsonResponse
from django.views import View

from registry.models import Model, Prediction
from main.api import get_municipality_info
from main.utils import UF_CODES
from vis.dash.errors import VisualizationError
from .dash.charts import line_charts_by_geocode
from .home.vis_charts import uf_ibge_mapping
from .utils import merge_uri_params, geo_obj_to_dataframe, obj_to_dataframe
from .models import ResultsProbForecast, GeoMacroSaude

code_to_state = {v: k for k, v in UF_CODES.items()}


class DashboardView(View):
    template_name = "vis/dashboard.html"

    def get(self, request):
        context = {}

        context["selectedDisease"] = None
        context["selectedTimeResolution"] = None
        context["selectedADMLevel"] = None
        context["selectedSpatial"] = None
        context["selectedTemporal"] = None
        context["selectedOutputFormat"] = None
        context["selectedGeocode"] = None
        selected_prediction_ids = set()

        selected_model = request.GET.get("model", None)
        selected_predictions = request.GET.getlist("predict", None)

        if selected_model:
            model = Model.objects.get(pk=selected_model)
            context["selectedDisease"] = model.disease or None
            context["selectedTimeResolution"] = model.time_resolution or None
            context["selectedADMLevel"] = model.ADM_level
            context["selectedSpatial"] = model.spatial
            context["selectedTemporal"] = model.temporal
            context["selectedOutputFormat"] = model.categorical

        if selected_predictions:
            for id in selected_predictions:
                prediction = Prediction.objects.get(pk=id)
                context["selectedDisease"] = prediction.model.disease or None
                context["selectedTimeResolution"] = (
                    prediction.model.time_resolution or None
                )
                context["selectedADMLevel"] = prediction.model.ADM_level
                context["selectedSpatial"] = prediction.model.spatial
                context["selectedTemporal"] = prediction.model.temporal
                context["selectedOutputFormat"] = prediction.model.categorical
                context["selectedGeocode"] = prediction.adm_2_geocode or None
                selected_prediction_ids.add(prediction.id)

        if context["selectedDisease"] == "chikungunya":
            context["selectedDisease"] = "chik"

        context["selectedPredictions"] = list(selected_prediction_ids)

        models = Model.objects.all()
        predictions = Prediction.objects.filter(visualizable=True)

        city_names_w_uf = []
        for geocode in predictions.values_list("adm_2_geocode", flat=True):
            if geocode:
                _, info = get_municipality_info(request, geocode)
                city_names_w_uf.append(f"{info['municipio']} - {info['uf']}")

        predictions_data = list(
            zip(
                list(predictions.values_list("id", flat=True)),
                list(predictions.values_list("model__name", flat=True)),
                list(predictions.values_list("metadata", flat=True)),
                city_names_w_uf,
            )
        )

        context["predictions"] = predictions_data

        model_types = set()
        output_formats = set()
        for model in models:
            if model.categorical:
                output_formats.add("C")
            else:
                output_formats.add("Q")

            if model.spatial:
                model_types.add("spatial")

            if model.temporal:
                model_types.add("temporal")

        context["model_types"] = list(model_types)
        context["output_formats"] = list(output_formats)

        context["diseases"] = list(
            set(models.values_list("disease", flat=True))
        )

        context["adm_levels"] = list(
            set(models.values_list("ADM_level", flat=True))
        )

        context["time_resolutions"] = list(
            set(models.values_list("time_resolution", flat=True))
        )

        adm_2_geocodes = set(
            predictions.values_list("adm_2_geocode", flat=True)
        )

        geocode_cities = set()
        municipios_file = os.path.join("static", "data/geo/BR/municipios.json")
        if os.path.isfile(municipios_file):
            uf_codes = dict()
            for uf, info in uf_ibge_mapping.items():
                uf_codes[int(info["code"])] = uf

            with open(municipios_file, "rb") as f:
                geocodes = json.load(f)

            for geocode in geocodes:
                if int(geocode) in adm_2_geocodes:
                    data = geocodes[geocode]
                    geocode_cities.add(
                        (
                            geocode,
                            data["municipio"],
                            uf_codes[int(data["codigo_uf"])],
                        )
                    )

        context["selected_predictions_uri"] = merge_uri_params(
            selected_predictions, "predict"
        )

        context["adm_2_geocodes"] = list(geocode_cities)

        return render(request, self.template_name, context)


class LineChartsView(View):
    template_name = "vis/charts/line-charts.html"

    @xframe_options_exempt
    def get(self, request):
        context = {}

        prediction_ids = request.GET.getlist("predict")

        diseases: set[str] = set()
        for id in prediction_ids:
            predict = get_object_or_404(Prediction, pk=id)
            diseases.add(predict.model.disease)

        if len(diseases) > 1:
            raise VisualizationError(
                "Multiple diseases were selected to be visualized"
            )

        if not prediction_ids:
            # Show "Please select Predictions"
            return render(request, "vis/errors/no-prediction.html", context)

        try:
            line_chart = line_charts_by_geocode(
                title="Forecast of dengue new cases",
                predictions_ids=list(set(prediction_ids)),
                disease=diseases.pop(),
                width=450,
                request=request,
            )
            line_chart = line_chart.to_html().replace(
                "</head>",
                "<style>#vis.vega-embed {width: 100%;}</style></head>",
            )
            context["line_chart"] = line_chart
        except Exception as e:
            # TODO: ADD HERE ERRORING PAGES TO BE RETURNED
            context["error"] = e

        return render(request, self.template_name, context)


class PredictTableView(View):
    template_name = "vis/charts/prediction-table.html"

    @xframe_options_exempt
    def get(self, request):
        prediction_ids = request.GET.getlist("predict")
        context = {}

        colors = cycle(
            [
                "#A6BCD4",
                "#FAC28C",
                "#F2ABAB",
                "#B9DBD9",
                "#AAD1A5",
                "#F7E59D",
                "#D9BCD1",
                "#FFCED3",
                "#CEBAAE",
            ]
        )

        predictions: set[Prediction] = set()
        for id in prediction_ids:
            predict = get_object_or_404(Prediction, pk=id)
            predictions.add(predict)

        infos = []
        for prediction in predictions:
            info = {}
            info["model"] = f"{prediction.model.id} - {prediction.model.name}"
            info["prediction_id"] = prediction.id
            info["disease"] = prediction.model.disease.capitalize()
            if prediction.adm_2_geocode and prediction.model.ADM_level == 2:
                geocode = prediction.adm_2_geocode
                geocode_info = json.loads(
                    get_geocode_info(request, geocode).content
                )
                info["locality"] = geocode_info["municipio"]
            else:
                info["locality"] = "BR"  # TODO
            info["prediction_date"] = prediction.predict_date
            info["color"] = next(colors)
            infos.append(info)

        context["prediction_infos"] = infos
        return render(request, self.template_name, context)


class MacroForecastMap(View):
    template_name = "vis/charts/macro-forecast-map.html"

    def get(self, request):
        context = {}
        try:
            map = get_macro_forecast_map(datetime.date(2024, 3, 11), 4108)
            context["res"] = map.to_html()
        except GeoMacroSaude.DoesNotExist:
            ...
        except ResultsProbForecast.DoesNotExist:
            ...

        return render(request, self.template_name, context)


def get_macro_forecast_map(date: datetime.date, geocode: int):
    macro_saude = GeoMacroSaude.objects.get(geocode=str(geocode))

    res_prob = ResultsProbForecast.objects.get(
        date=date, geocode=str(macro_saude.geocode)
    )

    df = obj_to_dataframe(res_prob)

    df["date"] = df["date"].apply(lambda x: str(x))

    df.prob_low = -df.prob_low

    df["prob_color"] = df.apply(
        lambda x: x.prob_low
        if abs(x.prob_low) > abs(x.prob_high)
        else x.prob_high,
        axis=1,
    )

    df["prob_color"] = df.prob_color.apply(lambda x: 0 if abs(x) < 50 else x)

    df = df.drop(columns="id")

    df_macro = geo_obj_to_dataframe(macro_saude)

    df_macro["state_code"] = df_macro["state"]

    df_macro["state"] = df_macro["state"].astype(int).replace(code_to_state)

    df_macro = df_macro.merge(df, on="geocode", how="left")

    df_macro = gpd.GeoDataFrame(df_macro)

    df_macro.set_geometry("geometry")

    df_macro["desc_prob"] = np.nan

    df_macro.loc[
        df_macro.prob_color > 0, "desc_prob"
    ] = "Probabilidade de a incidência superar o limiar histórico"

    df_macro.loc[
        df_macro.prob_color < 0, "desc_prob"
    ] = "Probabilidade de a incidência ser abaixo do limiar inferior histórico"

    map_dist = (
        alt.Chart(df_macro, title="")
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "high_incidence_threshold:Q",
                scale=alt.Scale(scheme="viridis"),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title="Incidência /100.000 hab.",
                    titleOrient="left",
                ),
            ),
            tooltip=[
                alt.Tooltip("state:N", title="Estado:"),
                # alt.Tooltip('name_code_macro:N', title='Macrorregião:'),
                alt.Tooltip("high_incidence_threshold:Q", title="Incidência:"),
            ],
        )
    )

    text_dist = (
        alt.Chart(df_macro)
        .mark_text(dy=-170, dx=20, size=14, fontWeight=100)
        .encode(text="date:N")
        .transform_calculate(
            date='"Limiar superior de Incidência na semana de " + datum.date'
        )
    )

    map_prob = (
        alt.Chart(df_macro, title="")
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "prob_color:Q",
                scale=alt.Scale(scheme="redblue", reverse=True),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title="Probabilidade (%)",
                    titleOrient="left",
                ),
            ),
            tooltip=[
                alt.Tooltip("state:N", title="Estado:"),
                # alt.Tooltip('name_code_macro:N', title='Macrorregião:'),
                alt.Tooltip("prob_color:Q", title="Probabilidade (%):"),
                alt.Tooltip("desc_prob:N", title="Info:"),
            ],
        )
    )

    text_prob = (
        alt.Chart(df_macro)
        .mark_text(dy=-170, dx=20, size=14, fontWeight=100)
        .encode(text="date:N")
        .transform_calculate(
            date='"Previsão probabilística na semana de " + datum.date'
        )
    )

    final_maps = alt.hconcat(
        alt.layer(map_dist, text_dist), alt.layer(map_prob, text_prob)
    ).resolve_scale(color="independent")

    ranked_table_prob = (
        alt.Chart(
            df_macro[
                [
                    "date",
                    "state",
                    # 'name_code_macro',
                    "prob_color",
                    "high_incidence_threshold",
                ]
            ]
        )
        .mark_text(align="right")
        .encode(y=alt.Y("row_number:O").axis(None))
        .transform_window(
            row_number="row_number()",
            rank="rank(prob_color)",
            sort=[alt.SortField("prob_color", order="descending")],
        )
        .transform_filter(alt.datum.prob_color > 90)
    )

    d = ranked_table_prob.encode(text="date:N").properties(
        title=alt.Title(text="date", align="right")
    )

    # name = ranked_table_prob.encode(text='name_code_macro:N').properties(
    #     title=alt.Title(text='Macrorregião', align='right')
    # )

    state = ranked_table_prob.encode(text="state:N").properties(
        title=alt.Title(text="Estado", align="right")
    )

    prob = ranked_table_prob.encode(text="prob_color:N").properties(
        title=alt.Title(text="Probabilidade (%)", align="right")
    )

    inc = ranked_table_prob.encode(
        text="high_incidence_threshold:Q"
    ).properties(
        title=alt.Title(
            text="Limiar superior de Incidência (100k)", align="right"
        )
    )

    table_prob = alt.hconcat(
        d,
        state,
        # name,
        inc,
        prob,
    )

    final_plot = alt.vconcat(final_maps, table_prob).configure_view(
        stroke=None
    )

    return final_plot


def get_model_selector_item(request, model_id):
    try:
        model = Model.objects.get(pk=model_id)
        data = {
            "name": model.name,
            "description": model.description,
        }
        return JsonResponse(data)
    except Model.DoesNotExist:
        return JsonResponse({"error": "Model not found"}, status=404)


def get_prediction_selector_item(request, prediction_id):
    try:
        prediction = Prediction.objects.get(pk=prediction_id)
        data = {
            "model_id": prediction.model.id,
            "description": prediction.description,
        }
        return JsonResponse(data)
    except Prediction.DoesNotExist:
        return JsonResponse({"error": "Prediction not found"}, status=404)


def get_geocode_info(request, geocode: Union[str, int]):
    geocode = str(geocode)
    municipios_file = os.path.join("static", "data/geo/BR/municipios.json")

    if os.path.isfile(municipios_file):
        with open(municipios_file, "r") as f:
            geocodes = json.load(f)

        data = geocodes[geocode]
        uf_code = data["codigo_uf"]

        for uf, info in uf_ibge_mapping.items():
            if str(info["code"]) == str(uf_code):
                data["uf"] = uf

        return JsonResponse(data)
    else:
        return JsonResponse({"error": "Geocode not found"}, status=404)
