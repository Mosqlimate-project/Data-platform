from datetime import date
from typing import Literal, List, Optional

import altair as alt
import pandas as pd
import numpy as np
import scipy.stats as stats
from django.db import models
from scoringrules import crps_normal, logs_normal
from sklearn.metrics import mean_squared_error, mean_absolute_error
from loguru import logger

from .charts import watermark
from main.utils import UFs, CODES_UF
from vis.plots.home.vis_charts import historico_alerta_data_for
from datastore.models import DengueGlobal, Sprint202425
from registry.models import Prediction, PredictionDataRow


def calculate_score(
    queryset: models.QuerySet[PredictionDataRow],
    data: pd.DataFrame,
    confidence_level: float = 0.9,
) -> models.QuerySet[PredictionDataRow]:
    data_df = data[["date", "casos"]]
    data_df.date = pd.to_datetime(data_df.date)

    z_value = stats.norm.ppf((1 + confidence_level) / 2)

    def dt_range(df):
        return (df.date >= min_date) & (df.date <= max_date)

    scores = {}

    for _id in queryset.values_list("predict_id", flat=True).distinct():
        pred_df = Prediction.objects.get(pk=_id).to_dataframe()

        pred_df = pred_df.sort_values(by="date")
        pred_df.date = pd.to_datetime(pred_df.date)

        min_date = max(min(data_df.date), min(pred_df.date))
        max_date = min(max(data_df.date), max(pred_df.date))

        _data_df = data_df.loc[dt_range(data_df)].reset_index(drop=True)
        _pred_df = pred_df.loc[dt_range(pred_df)].reset_index(drop=True)

        if _data_df.empty or _pred_df.empty:
            logger.warning(
                "[LINE-CHART]: couldn't calculate score for Prediction "
                + f"'{_id}'. Ignoring"
            )
            continue

        mae = mean_absolute_error(_data_df.casos, _pred_df.pred)
        mse = mean_squared_error(_data_df.casos, _pred_df.pred)

        crps = np.mean(
            crps_normal(
                _data_df.casos,
                _pred_df.pred,
                (_pred_df.upper - _pred_df.lower) / (2 * z_value),
            )
        )

        log_score = logs_normal(
            _data_df.casos,
            _pred_df.pred,
            (_pred_df.upper - _pred_df.lower) / (2 * z_value),
            negative=False,
        )

        log_score_mean = np.mean(
            np.maximum(log_score, np.repeat(-100, len(log_score)))
        )

        alpha = 1 - confidence_level
        upper_bound = _pred_df.upper.values
        lower_bound = _pred_df.lower.values

        penalty = (
            2 / alpha * np.maximum(0, lower_bound - _data_df.casos.values)
        ) + (2 / alpha * np.maximum(0, _data_df.casos.values - upper_bound))
        interval_score = np.mean((upper_bound - lower_bound) + penalty)

        scores[_id] = dict(
            mae=mae,
            mse=mse,
            crps=crps,
            log_score=log_score_mean,
            interval_score=interval_score,
        )

    mae_c, mse_c, crps_c, log_score_c, interval_score_c = [], [], [], [], []

    for _id, score in scores.items():
        mae_c.append(
            models.When(
                predict_id=_id,
                then=models.Value(
                    score["mae"], output_field=models.FloatField()
                ),
            )
        )
        mse_c.append(
            models.When(
                predict_id=_id,
                then=models.Value(
                    score["mse"], output_field=models.FloatField()
                ),
            )
        )
        crps_c.append(
            models.When(
                predict_id=_id,
                then=models.Value(
                    score["crps"], output_field=models.FloatField()
                ),
            )
        )
        log_score_c.append(
            models.When(
                predict_id=_id,
                then=models.Value(
                    score["log_score"], output_field=models.FloatField()
                ),
            )
        )
        interval_score_c.append(
            models.When(
                predict_id=_id,
                then=models.Value(
                    score["interval_score"], output_field=models.FloatField()
                ),
            )
        )

    queryset = queryset.annotate(
        mae=models.Case(
            *mae_c,
            default=models.Value(None, output_field=models.FloatField()),
            output_field=models.FloatField(),
        ),
        mse=models.Case(
            *mse_c,
            default=models.Value(None, output_field=models.FloatField()),
            output_field=models.FloatField(),
        ),
        crps=models.Case(
            *crps_c,
            default=models.Value(None, output_field=models.FloatField()),
            output_field=models.FloatField(),
        ),
        log_score=models.Case(
            *log_score_c,
            default=models.Value(None, output_field=models.FloatField()),
            output_field=models.FloatField(),
        ),
        interval_score=models.Case(
            *interval_score_c,
            default=models.Value(None, output_field=models.FloatField()),
            output_field=models.FloatField(),
        ),
    )

    return queryset


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
            DengueGlobal.objects.using("infodengue")
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
    colors: list[str],
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
            domain=list(predicts_df["prediction"].unique()), range=colors
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

        points = (
            base.mark_circle()
            .encode(opacity=alt.value(0))
            .add_params(highlight)
        )

        timeseries = timeseries_chart(
            predicts_df=predicts_df, width=width, colors=colors
        )

        final += points + lines + timeseries

    return final


def timeseries_chart(
    predicts_df: pd.DataFrame, width: int, colors: List[str]
) -> alt.Chart:
    color_scale = alt.Scale(
        domain=list(predicts_df["prediction"].unique()), range=colors
    )

    highlight = alt.selection_point(
        on="mouseover", nearest=True, fields=["prediction"]
    )

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
