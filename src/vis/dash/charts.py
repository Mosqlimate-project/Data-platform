from typing import Literal
from datetime import date
import pandas as pd
import altair as alt

from django.urls import reverse
from django.db.models import Sum
from django.http import HttpRequest

from registry.models import Prediction, Model
from vis.plots.home.vis_charts import historico_alerta_data_for
from main.utils import UF_CODES, UFs
from datastore.models import DengueGlobal, Sprint202425
from .errors import NotFoundError, VisualizationError


def watermark(
    request: HttpRequest,
    opacity: float,
    ini_x: int,
    end_x: int,
    ini_y: int,
    end_y: int,
) -> alt.Chart:
    return (
        alt.Chart(
            {
                "values": [
                    {
                        "url": request.build_absolute_uri(
                            reverse("api-1:get_mosqlimate_logo")
                        )
                    }
                ]
            }
        )
        .mark_image(opacity=opacity)
        .encode(
            x=alt.value(ini_x),  # point in x axis
            x2=alt.value(end_x),  # pixels from x (left)
            y=alt.value(ini_y),
            y2=alt.value(end_y),  # pixels from y (top)
            url="url:N",
        )
    )


def predictions_df_by_geocode(predictions_ids: list[int]):
    predicts = []
    for id in predictions_ids:
        try:
            p = Prediction.objects.get(pk=id)
            predicts.append(p)
        except Prediction.DoesNotExist:
            raise NotFoundError(f"Prediction with ID {id} was not found")

    # if not compatible_predictions(predicts):
    #     raise ComparisonError(predicts)  # TODO

    dfs = []
    for p in predicts:
        if p.visualizable:
            df_flat = p.to_dataframe()
            df_flat.date = pd.to_datetime(df_flat.date)
            df_flat["model_id"] = p.model.id
            df_flat["prediction"] = p.id
            dfs.append(df_flat)

    try:
        df = pd.concat(dfs, axis=0)
    except ValueError:
        # TODO: Improve error handling
        raise VisualizationError("DataFrame error")

    if df.empty:
        # TODO: Improve error handling
        raise NotFoundError("empty dataframe")

    return df


def dataframe_by_geocode(
    disease: Literal["dengue", "chikungunya", "zika"],
    start: date,
    end: date,
    adm_1_geocode: int = None,
    adm_2_geocode: int = None,
    width="container",
    x: str = "date",
    y: str = "target",
    legend: str = "Data",
    sprint: bool = False,
) -> pd.DataFrame:
    if sprint:
        data = Sprint202425.objects.using("infodengue").all()
    else:
        data = historico_alerta_data_for(disease)

    codes_uf = {v: k for k, v in UF_CODES.items()}
    res = {x: [], y: []}

    if adm_1_geocode:
        try:
            uf = codes_uf[int(adm_1_geocode)]
        except (KeyError, ValueError):
            raise VisualizationError(
                f"Unkown UF Geocode {adm_1_geocode}. Example: 31"
            )
        uf_name = UFs[uf]
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )

        if sprint:
            data = (
                data.filter(
                    date__gt=start,
                    date__lt=end,
                    geocode__in=geocodes,
                )
                .values("date")
                .annotate(casos=Sum("casos"))
                .order_by("date")
            )
            for obj in data:
                res[x].append(obj["date"])
                res[y].append(obj["casos"])
        else:
            data = (
                data.filter(
                    data_iniSE__gt=start,
                    data_iniSE__lt=end,
                    municipio_geocodigo__in=geocodes,
                )
                .values("data_iniSE")
                .annotate(casos=Sum("casos"))
                .order_by("data_iniSE")
            )
            for obj in data:
                res[x].append(obj["data_iniSE"])
                res[y].append(obj["casos"])

    if adm_2_geocode:
        if sprint:
            data = data.filter(
                date__gt=start,
                date__lt=end,
                geocode=adm_2_geocode,
            )
            for obj in data:
                res[x].append(obj.date)
                res[y].append(obj.casos)
        else:
            data = data.filter(
                data_iniSE__gt=start,
                data_iniSE__lt=end,
                municipio_geocodigo=adm_2_geocode,
            )
            for obj in data:
                res[x].append(obj.data_iniSE)
                res[y].append(obj.casos)

    df = pd.DataFrame(res)
    df["legend"] = "Data"
    df.date = pd.to_datetime(df.date)

    return df


def line_charts_by_geocode(
    title: str,
    predictions_ids: list[int],
    width="container",
    disease: str = "dengue",
    request=None,
):
    x = "date"
    y = "target"

    adm_1_geocode: int = None
    adm_2_geocode: int = None

    model: Model = None
    sprint: bool = False

    for prediction_id in predictions_ids:
        try:
            prediction = Prediction.objects.get(pk=prediction_id)
        except Prediction.DoesNotExist:
            raise VisualizationError("Prediction not found")

        adm_level = prediction.model.ADM_level
        if adm_level == 1:
            if not adm_1_geocode:
                adm_1_geocode = prediction.adm_1_geocode

            if adm_1_geocode != prediction.adm_1_geocode:
                raise VisualizationError(
                    "Two different geocodes were added to be visualized"
                )

        if adm_level == 2:
            if not adm_2_geocode:
                adm_2_geocode = prediction.adm_2_geocode

            if adm_2_geocode != prediction.adm_2_geocode:
                raise VisualizationError(
                    "Two different geocodes were added to be visualized"
                )

        if not model:
            model = prediction.model

        if model and model.sprint != prediction.model.sprint:
            raise VisualizationError(
                "Sprint Predictions shaw only be vizualized with other Sprint "
                "Predictions"
            )

        sprint = model.sprint

    if not adm_1_geocode and not adm_2_geocode:
        raise VisualizationError("No geocode was selected to be visualized")

    predicts_df = predictions_df_by_geocode(predictions_ids)
    predict_id_values = predicts_df["prediction"].unique()

    colors = [
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

    custom_color_scale = alt.Scale(
        domain=list(predict_id_values), range=colors
    )

    highlight = alt.selection_point(
        on="mouseover",
        value=predicts_df.model_id.values[0],
        fields=["prediction"],
        nearest=True,
    )

    data_df = dataframe_by_geocode(
        disease=disease,
        adm_1_geocode=adm_1_geocode,
        adm_2_geocode=adm_2_geocode,
        start=min(predicts_df.date),
        end=max(predicts_df.date),
        width=width,
        x=x,
        y=y,
        legend="Data",
        sprint=sprint,
    )

    if not data_df.empty:
        data_chart = (
            alt.Chart(data_df)
            .mark_circle(size=60)
            .encode(
                x=f"{x}:T",
                y=f"{y}:Q",
                color=alt.value("black"),
                opacity=alt.Opacity("legend", legend=alt.Legend(title=None)),
                tooltip=f"{y}:Q",
            )
            .properties(width=width)
        )

    base = (
        base_model_chart(
            data=predicts_df,
        )
        .add_params(highlight)
        .properties(width=width)
    )

    points = (
        base.mark_circle().encode(opacity=alt.value(0)).add_params(highlight)
    )

    lines = (
        base.mark_line()
        .encode(
            color=alt.condition(
                highlight,
                alt.Color("prediction:N", scale=custom_color_scale),
                alt.value("lightgray"),
            ),
            tooltip=["prediction:N", "pred"],
        )
        .properties(
            title=alt.TitleParams(
                "https://mosqlimate.org/",
                color="lightgray",
                baseline="bottom",
                orient="bottom",
                anchor="end",
            )
        )
    )

    timeseries = (
        base.mark_line()
        .encode(color=alt.Color("prediction:N", scale=custom_color_scale))
        .transform_filter(highlight)
    )

    timeseries_conf = (
        base.mark_area(opacity=0.5)
        .encode(x="date:T", y="lower:Q", y2="upper:Q")
        .transform_filter(highlight)
    ).properties(
        title=alt.TitleParams(
            "https://mosqlimate.org/",
            color="lightgray",
            baseline="bottom",
            orient="bottom",
            anchor="end",
        )
    )

    wk = watermark(
        request, opacity=0.25, ini_x=150, end_x=300, ini_y=60, end_y=230
    )

    if not data_df.empty:
        final = (
            points + lines + data_chart + wk
            | timeseries + timeseries_conf + data_chart + wk
        )
    else:
        final = points + lines + wk | timeseries + timeseries_conf + wk

    return final


def base_model_chart(
    data: pd.DataFrame,
    x: str = "date",
    x_title: str = "Dates",
    y: str = "pred",
    y_title="New cases",
) -> alt.Chart:
    return alt.Chart(data).encode(
        x=alt.X(f"{x}:T", axis=alt.Axis(format="%b/%Y")).title(x_title),
        y=alt.Y(f"{y}:Q").title(y_title),
        color="prediction:N",
    )
