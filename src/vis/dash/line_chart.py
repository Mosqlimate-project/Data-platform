from datetime import date
from typing import Literal, List, Optional

import altair as alt
import pandas as pd
from django.db import models

from .charts import watermark
from main.utils import UFs
from vis.plots.home.vis_charts import historico_alerta_data_for
from datastore.models import DengueGlobal, Sprint202425
from registry.models import Prediction, PredictionDataRow


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

    if int(adm_level) == 1:
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=UFs[adm_1])
            .values_list("geocodigo", flat=True)
        )
    if int(adm_level) == 2:
        geocodes = [int(adm_2)]

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


def predictions_data(
    adm_level: Literal[1, 2],
    time_resolution: str,
    predict_ids: List[int] = [],
    start_window_date: Optional[date] = None,
    end_window_date: Optional[date] = None,
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
    sprint: Optional[bool] = None,
    disease: Optional[str] = None,
) -> pd.DataFrame:
    if not predict_ids:
        data = PredictionDataRow.objects.filter(
            predict__model__time_resolution=time_resolution,
            predict__model__sprint=sprint,
            predict__model__disease=disease,
            predict__model__ADM_level=adm_level,
            date__range=(start_window_date, end_window_date),
        )
    else:
        data = PredictionDataRow.objects.filter(predict__id__in=predict_ids)
        if start_window_date and end_window_date:
            data = data.filter(
                date__range=(start_window_date, end_window_date)
            )

    if int(adm_level) == 1:
        data = data.filter(adm_1=adm_1)

    if int(adm_level) == 2:
        data = data.filter(adm_2=int(adm_2))

    data = data.annotate(
        model_id=models.F("predict__model__id"),
        prediction=models.F("predict__id"),
    )

    return pd.DataFrame.from_records(
        data.values(*Prediction.fields, "model_id", "prediction"),
        columns=Prediction.fields + ["model_id", "prediction"],
    )


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
            y=alt.Y("target:Q").title("New cases"),
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
                y=alt.Y("target:Q").title("New cases"),
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
    colors: List[str],
    sprint: bool,
    disease: str,
    adm_level: Literal[1, 2],
    time_resolution: str,
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
    start_window_date: Optional[date] = None,
    end_window_date: Optional[date] = None,
    predict_ids: Optional[List[int]] = None,
) -> alt.Chart:
    predicts_df = predictions_data(
        adm_level=adm_level,
        time_resolution=time_resolution,
        predict_ids=predict_ids,
        start_window_date=start_window_date,
        end_window_date=end_window_date,
        adm_1=adm_1,
        adm_2=adm_2,
        sprint=sprint,
        disease=disease,
    )

    data = data_chart(
        width=width,
        sprint=sprint,
        disease=disease,
        adm_level=adm_level,
        adm_1=adm_1,
        adm_2=adm_2,
        start_window_date=start_window_date,
        end_window_date=end_window_date,
    )

    wk = watermark(opacity=0.25, ini_x=150, end_x=300, ini_y=60, end_y=230)

    final = data + wk

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
                y=alt.Y("target:Q").title("New cases"),
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
            y=alt.Y("target:Q").title("New cases"),
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
