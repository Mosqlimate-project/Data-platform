from typing import Literal
from datetime import date
import pandas as pd
import altair as alt

from registry.models import Prediction
from vis.home.vis_charts import historico_alerta_data_for
from .errors import NotFoundError, VisualizationError
from itertools import product
from sklearn.metrics import mean_squared_error as mse
from sklearn.metrics import mean_squared_log_error as msle
from sklearn.metrics import mean_absolute_error as mae
from sklearn.metrics import mean_absolute_percentage_error as mape


def create_error_df(
    data: pd.DataFrame,
    preds: pd.DataFrame,
) -> pd.DataFrame:
    predict_ids = preds.predict_id.unique()

    metrics = ["MAE", "MSE", "RMSE", "MSLE", "MAPE"]

    df_error = pd.DataFrame(columns=["predict_id", "metric", "error"])

    for pred_id, metric in product(predict_ids, metrics):
        if metric == "MAE":
            erro = mae(
                data.target, preds.loc[preds.predict_id == pred_id].preds
            )

        if metric == "MSE":
            erro = mse(
                data.target, preds.loc[preds.predict_id == pred_id].preds
            )

        if metric == "RMSE":
            erro = mse(
                data.target,
                preds.loc[preds.predict_id == pred_id].preds,
                squared=False,
            )

        if metric == "MSLE":
            erro = msle(
                data.target, preds.loc[preds.predict_id == pred_id].preds
            )

        if metric == "MAPE":
            erro = mape(
                data.target, preds.loc[preds.predict_id == pred_id].preds
            )

        df_e = {"predict_id": [pred_id], "metric": [metric], "error": [erro]}

        df_error = pd.concat([df_error, pd.DataFrame(df_e)])

    df_error = df_error.reset_index(drop=True)

    return df_error


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
        if any(p.visualizable()):
            df_flat = p.prediction_df
            df_flat.dates = pd.to_datetime(df_flat.dates)
            df_flat["model_id"] = p.model.id
            df_flat["predict_id"] = p.id
            dfs.append(df_flat)

    try:
        df = pd.concat(dfs, axis=0)
    except ValueError:
        # TODO: Improve error handling
        raise VisualizationError(df)

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


def get_cases_by_geocode(
    disease: Literal["dengue", "chikungunya", "zika"],
    start: date,
    end: date,
    geocode: int,
    x: str = "dates",
    y: str = "target",
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

    return df


def line_charts_by_geocode(
    title: str,
    predictions_ids: list[int],
    width="container",
    disease: str = "dengue",
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


def error_bar_charts_by_geocode(
    title: str,
    predictions_ids: list[int],
    width="container",
    disease: str = "dengue",
):
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

    data = get_cases_by_geocode(
        disease=disease,
        geocode=geocode,
        start=min(predicts_df.dates),
        end=max(predicts_df.dates),
        x="dates",
        y="target",
    )

    df_error = create_error_df(
        data=data,
        preds=predicts_df,
    )

    metrics = ["MAE", "MSE", "RMSE", "MSLE", "MAPE"]

    input_dropdown = alt.binding_select(options=metrics, name="Metrics")
    selection = alt.selection_single(fields=["metric"], bind=input_dropdown)

    bars = (
        alt.Chart(df_error)
        .mark_bar()
        .encode(
            x="error",
            y=alt.Y("predict_id:N").sort("x"),
            color="predict_id:N",
            tooltip=["error"],
        )
        .add_params(selection)
        .transform_filter(selection)
        .properties(
            width=350,
        )
    )

    return bars


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
