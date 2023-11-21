from typing import Literal
from datetime import date
import json
import pandas as pd
import altair as alt
from pandas import json_normalize

from registry.models import Prediction

from vis.home.vis_charts import historico_alerta_data_for
from .errors import NotFoundError, ComparisonError
from .checks import compatible_predictions


def predictions_df_by_geocode(predictions_ids: list[int], geocode: int):
    predicts = []
    for id in predictions_ids:
        try:
            p = Prediction.objects.get(pk=id)
            predicts.append(p)
        except Prediction.DoesNotExist:
            raise NotFoundError(f"Prediction with ID {id} was not found")

    if not compatible_predictions(predicts):
        raise ComparisonError(predicts)  # TODO

    dfs = []
    for p in predicts:
        json_struct = json.loads(p.prediction)
        df_flat = json_normalize(json_struct)
        df_flat.dates = pd.to_datetime(df_flat.dates)
        df_flat = df_flat.loc[df_flat.adm_2 == geocode]
        df_flat["model_id"] = p.model.id
        df_flat["predict_id"] = p.id
        dfs.append(df_flat)

    df = pd.concat(dfs, axis=0)

    if df.empty:
        raise NotFoundError(f"No data for geocode {geocode}")

    return df


def data_chart_by_geocode(
    disease: Literal["dengue", "chikungunya", "zika"],
    start: date,
    end: date,
    geocode: int,
    width: int,
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
    geocode: int,
    width: int,
    disease: str = "dengue",
):
    x = "dates"
    y = "target"

    predicts_df = predictions_df_by_geocode(predictions_ids, geocode)

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
            title=title,
        )
        .add_params(highlight)
        .properties(width=width)
    )

    points = (
        base.mark_circle().encode(opacity=alt.value(0)).add_params(highlight)
    )

    # here we create the multiline plot and use the alt.condition
    # to highlight only one curve
    lines = base.mark_line().encode(
        # size=alt.condition(~highlight, alt.value(1), alt.value(3))
        color=alt.condition(
            highlight, alt.Color("predict_id:N"), alt.value("lightgray")
        ),
        tooltip=["predict_id:N", "preds"],
    )

    # here we define the plot of the right figure
    timeseries = (
        base.mark_line()
        .encode(color=alt.Color("predict_id:N"))
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
    )

    # here we concatenate the layers, the + put one layer above the other
    # the | put them syde by syde (as columns), and & put them side by side as lines
    final = (
        points + lines + data_chart | timeseries + timeseries_conf + data_chart
    )

    return final


def base_model_chart(
    data: pd.DataFrame,
    title: str,
    x: str = "dates",
    x_title: str = "Dates",
    y: str = "preds",
    y_title="New cases",
) -> alt.Chart:
    return alt.Chart(data, title=title).encode(
        x=alt.X(f"{x}:T").title(x_title),
        y=alt.Y(f"{y}:Q").title(y_title),
        color="predict_id:N",
    )
