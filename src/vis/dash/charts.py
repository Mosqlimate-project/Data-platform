from typing import Literal
from datetime import date
import pandas as pd
import altair as alt

from django.urls import reverse

from registry.models import Prediction

from vis.plots.home.vis_charts import historico_alerta_data_for
from .errors import NotFoundError, VisualizationError


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
            df_flat = p.prediction_df
            df_flat.dates = pd.to_datetime(df_flat.dates)
            df_flat["model_id"] = p.model.id
            df_flat["predict_id"] = p.id
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


def data_chart_by_geocode(
    disease: Literal["dengue", "chikungunya", "zika"],
    start: date,
    end: date,
    geocode: int,
    width="container",
    x: str = "dates",
    y: str = "target",
    legend: str = "Data",
) -> pd.DataFrame:
    hist_alerta = historico_alerta_data_for(disease)
    data = hist_alerta.filter(
        data_iniSE__gt=start, data_iniSE__lt=end, municipio_geocodigo=geocode
    )

    res = {x: [], y: []}
    for obj in data:
        res[x].append(obj.data_iniSE)
        res[y].append(obj.casos)

    df = pd.DataFrame(res)
    df["legend"] = "Data"
    df.dates = pd.to_datetime(df.dates)

    chart = (
        alt.Chart(df)
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

    return chart


def line_charts_by_geocode(
    title: str,
    predictions_ids: list[int],
    width="container",
    disease: str = "dengue",
    request=None,
):
    x = "dates"
    y = "target"

    geocode: int = None

    for prediction_id in predictions_ids:
        try:
            prediction = Prediction.objects.get(pk=prediction_id)
        except Prediction.DoesNotExist:
            # TODO: Improve error handling
            raise VisualizationError("Prediction not found")

        if not geocode:
            geocode = prediction.adm_2_geocode

        if geocode != prediction.adm_2_geocode:
            raise VisualizationError(
                "Two different geocodes were added to be visualized"
            )

    if not geocode:
        raise VisualizationError("No geocode was selected to be visualized")

    predicts_df = predictions_df_by_geocode(predictions_ids)
    predict_id_values = predicts_df["predict_id"].unique()

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

    # here is loaded the element that allows the selection by the mouse
    highlight = alt.selection_point(
        on="mouseover",
        value=predicts_df.model_id.values[0],
        fields=["predict_id"],
        nearest=True,
    )

    data_chart = data_chart_by_geocode(
        disease=disease,
        geocode=geocode,
        start=min(predicts_df.dates),
        end=max(predicts_df.dates),
        width=width,
        x=x,
        y=y,
        legend="Data",
    )

    # here is created the base element for the time series
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

    # here we create the multiline plot and use the alt.condition
    # to highlight only one curve
    lines = (
        base.mark_line()
        .encode(
            # size=alt.condition(~highlight, alt.value(1), alt.value(3))
            color=alt.condition(
                highlight,
                alt.Color("predict_id:N", scale=custom_color_scale),
                alt.value("lightgray"),
            ),
            tooltip=["predict_id:N", "preds"],
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

    # here we define the plot of the right figure
    timeseries = (
        base.mark_line()
        .encode(color=alt.Color("predict_id:N", scale=custom_color_scale))
        .transform_filter(
            highlight  # this function transform filter will just filter the element
            # in highlight from the column model N of the df_for
            # (defined in the base element)
        )
    )

    # here we create the area that represent the confidence interval of the predictions
    timeseries_conf = (
        base.mark_area(opacity=0.5)
        .encode(x="dates:T", y="lower:Q", y2="upper:Q")
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

    watermark = (
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
        .mark_image(opacity=0.25)
        .encode(
            x=alt.value(150),
            x2=alt.value(300),  # from left
            y=alt.value(60),
            y2=alt.value(230),  # from top
            url="url:N",
        )
    )

    # here we concatenate the layers, the + put one layer above the other
    # the | put them syde by syde (as columns), and & put them side by side as lines
    final = (
        points + lines + data_chart + watermark
        | timeseries + timeseries_conf + data_chart + watermark
    )

    return final


def base_model_chart(
    data: pd.DataFrame,
    x: str = "dates",
    x_title: str = "Dates",
    y: str = "preds",
    y_title="New cases",
) -> alt.Chart:
    return alt.Chart(data).encode(
        x=alt.X(f"{x}:T", axis=alt.Axis(format="%b/%Y")).title(x_title),
        y=alt.Y(f"{y}:Q").title(y_title),
        color="predict_id:N",
    )
