import warnings
from datetime import date
from typing import Literal, Optional

import altair as alt
import pandas as pd
import numpy as np
import scipy.stats as stats
from django.db import models
from scoringrules import crps_normal, logs_normal
from sklearn.metrics import mean_squared_error, mean_absolute_error

from .charts import watermark
from main.utils import UFs, CODES_UF
from vis.plots.home.vis_charts import historico_alerta_data_for
from datastore.models import Municipio, Sprint202425
from registry.models import Prediction, PredictionDataRow


np.seterr(divide="ignore", invalid="ignore")
warnings.filterwarnings(
    "ignore",
    message="divide by zero encountered in log",
    category=RuntimeWarning,
    module="scoringrules.backend.numpy",
)


def calculate_score(
    prediction: Prediction,
    confidence_level: float = 0.9,
) -> dict[str, float]:
    scores = dict(
        mae=None,
        mse=None,
        crps=None,
        log_score=None,
        interval_score=None,
    )

    data_df = hist_alerta_data(
        sprint=prediction.model.sprint,
        disease=prediction.model.disease,
        start_window_date=prediction.date_ini_prediction,
        end_window_date=prediction.date_end_prediction,
        adm_level=prediction.model.ADM_level,
        adm_1=prediction.adm_1_geocode,
        adm_2=prediction.adm_2_geocode,
    )

    if data_df.empty:
        return scores

    data_df.rename(columns={"target": "casos"}, inplace=True)
    data_df = data_df[["date", "casos"]]
    data_df.date = pd.to_datetime(data_df.date)

    pred_df = prediction.to_dataframe()
    pred_df = pred_df.sort_values(by="date")
    pred_df.date = pd.to_datetime(pred_df.date)

    min_date = max(min(data_df.date), min(pred_df.date))
    max_date = min(max(data_df.date), max(pred_df.date))

    def dt_range(df):
        return (df.date >= min_date) & (df.date <= max_date)

    data_df = data_df.loc[dt_range(data_df)].reset_index(drop=True)

    df = data_df.merge(pred_df, on="date", how="inner")

    if df.empty:
        return scores

    z_value = stats.norm.ppf((1 + confidence_level) / 2)

    scores["mae"] = mean_absolute_error(df.casos, df.pred)
    scores["mse"] = mean_squared_error(df.casos, df.pred)

    scores["crps"] = np.mean(
        crps_normal(
            df.casos,
            df.pred,
            (df.upper_90 - df.lower_90) / (2 * z_value),
        )
    )

    log_score = [
        abs(x)
        for x in logs_normal(
            df.casos,
            df.pred,
            (df.upper_90 - df.lower_90) / (2 * z_value),
            negative=False,
        )
        if not np.isinf(x)
    ]

    scores["log_score"] = (
        np.mean(np.maximum(log_score, np.repeat(-100, len(log_score))))
        if log_score
        else None
    )

    alpha = 1 - confidence_level
    upper_bound = df.upper_90.values
    lower_bound = df.lower_90.values

    penalty = (2 / alpha * np.maximum(0, lower_bound - df.casos.values)) + (
        2 / alpha * np.maximum(0, df.casos.values - upper_bound)
    )
    scores["interval_score"] = np.mean((upper_bound - lower_bound) + penalty)

    return {k: round(v, 2) if v is not None else v for k, v in scores.items()}


def hist_alerta_data(
    sprint: bool,
    disease: str,
    start_window_date: date,
    end_window_date: date,
    adm_level: Literal[1, 2],
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
) -> pd.DataFrame:
    if sprint:
        hist_alerta = Sprint202425.objects.using("infodengue").all()
        date_field = "date"
        geocode_field = "geocode"
    else:
        hist_alerta = historico_alerta_data_for(disease)
        date_field = "data_iniSE"
        geocode_field = "municipio_geocodigo"

    if str(adm_level) == "1":
        if str(adm_1).isdigit():
            adm_1 = CODES_UF[int(adm_1)]

        geocodes = (
            Municipio.objects.using("infodengue")
            .filter(uf=UFs[adm_1])
            .values_list("geocodigo", flat=True)
        )
    elif str(adm_level) == "2":
        geocodes = [int(adm_2)]
    else:
        raise ValueError("Incorrect adm_level value. Expecting: [1, 2]")

    data = (
        hist_alerta.filter(
            **{
                f"{date_field}__gt": start_window_date,
                f"{date_field}__lt": end_window_date,
                f"{geocode_field}__in": geocodes,
            },
        )
        .values(date_field)
        .annotate(casos=models.Sum("casos"))
        .order_by(date_field)
    )

    df = pd.DataFrame.from_records(data, columns=[date_field, "casos"])
    df.rename(columns={date_field: "date", "casos": "target"}, inplace=True)
    df["date"] = pd.to_datetime(df["date"])
    df["legend"] = "Data"
    return df


def base_chart(
    title: str,
    width: int,
    start_window_date: date,
    end_window_date: date,
) -> alt.Chart:
    dates = pd.date_range(start_window_date, end_window_date, freq="D")
    base_data = pd.DataFrame({"date": dates, "target": [None] * len(dates)})

    base = (
        alt.Chart(base_data)
        .mark_line()
        .encode(
            x=alt.X("date:T", axis=alt.Axis(format="%b/%Y")).title("Dates"),
            y=alt.Y("target:Q").title(title),
        )
        .properties(width=width, title=title)
    )

    wk = watermark(opacity=0.25, ini_x=150, end_x=300, ini_y=60, end_y=230)

    return base + wk


def data_chart(
    width: int,
    sprint: bool,
    disease: str,
    adm_level: Literal[1, 2],
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
    start_window_date: Optional[date] = None,
    end_window_date: Optional[date] = None,
) -> alt.Chart:
    hist_alerta_df = hist_alerta_data(
        sprint,
        disease,
        start_window_date,
        end_window_date,
        adm_level,
        adm_1,
        adm_2,
    )

    if not hist_alerta_df.empty:
        data_chart = (
            alt.Chart(hist_alerta_df)
            .mark_circle(size=60)
            .encode(
                x=alt.X("date:T", axis=alt.Axis(format="%b/%Y")).title(
                    "Dates"
                ),
                y=alt.Y("target:Q"),
                color=alt.value("black"),
                tooltip="target:Q",
            )
            .properties(
                width=width,
                title=alt.TitleParams(
                    "https://mosqlimate.org/",
                    color="lightgray",
                    baseline="bottom",
                    orient="bottom",
                    anchor="end",
                ),
            )
        )
        return data_chart
    else:
        return (
            alt.Chart()
            .mark_circle()
            .encode()
            .properties(
                width=width,
                title=alt.TitleParams(
                    "https://mosqlimate.org/",
                    color="lightgray",
                    baseline="bottom",
                    orient="bottom",
                    anchor="end",
                ),
            )
        )


def predictions_chart(
    title: str,
    width: int,
    colors: dict[int, str],
    queryset: models.QuerySet[PredictionDataRow],
    data_chart: alt.Chart,
    start_window_date: date,
    end_window_date: date,
) -> alt.Chart:
    queryset = queryset.annotate(
        model_id=models.F("predict__model__id"),
        prediction=models.F("predict__id"),
    )

    predicts_df = pd.DataFrame.from_records(
        queryset.values(*Prediction.fields, "model_id", "prediction"),
        columns=Prediction.fields + ["model_id", "prediction"],
    )

    wk = watermark(opacity=0.25, ini_x=150, end_x=300, ini_y=60, end_y=230)

    final = data_chart + wk

    if predicts_df.empty:
        base = base_chart(
            title=title,
            width=width,
            start_window_date=start_window_date,
            end_window_date=end_window_date,
        )

        final += base
    else:
        color_scale = alt.Scale(
            domain=list(predicts_df["prediction"].unique()),
            range=[
                colors.get(str(pred), "lightgray")
                for pred in predicts_df["prediction"].unique()
            ],
        )

        highlight = alt.selection_point(
            on="mouseover",
            value=predicts_df.model_id.values[0],
            fields=["prediction"],
            nearest=True,
        )

        base = (
            alt.Chart(predicts_df)
            .encode(
                x=alt.X("date:T", axis=alt.Axis(format="%b/%Y")).title(
                    "Dates"
                ),
                y=alt.Y("pred:Q").title(title),
                color="prediction:N",
            )
            .add_params(highlight)
            .properties(width=width)
        )

        lines = (
            base.mark_line()
            .encode(
                color=alt.condition(
                    highlight,
                    alt.Color("prediction:N", scale=color_scale),
                    alt.value("lightgray"),
                ),
                strokeWidth=alt.condition(
                    highlight,
                    alt.value(3),
                    alt.value(1),
                ),
                tooltip=["prediction:N", "pred"],
            )
            .add_params(highlight)
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

        points = (
            base.mark_circle()
            .encode(opacity=alt.value(0))
            .add_params(highlight)
        )

        timeseries = timeseries_chart(
            predicts_df=predicts_df, width=width, color_scale=color_scale
        )

        final += points + lines + timeseries

    return final


def timeseries_chart(
    predicts_df: pd.DataFrame, width: int, color_scale: alt.Scale
) -> alt.Chart:
    highlight = alt.selection_point(on="mouseover", fields=["prediction"])

    base = (
        alt.Chart(predicts_df)
        .encode(
            x=alt.X("date:T", axis=alt.Axis(format="%b/%Y")).title("Dates"),
            y=alt.Y("target:Q"),
            color="prediction:N",
        )
        .properties(width=width)
    )

    lines = (
        base.mark_line()
        .encode(
            color=alt.condition(
                highlight,
                alt.Color("prediction:N", scale=color_scale),
                alt.value("lightgray"),
            ),
            tooltip=["prediction:N", "target:Q"],
        )
        .add_params(highlight)
    )

    return lines
