import warnings
from datetime import date
from typing import Literal, Optional

import altair as alt
import pandas as pd
import numpy as np
from django.db import models
from django.contrib.auth import get_user_model
from mosqlient.scoring.score import Scorer

from .charts import watermark
from main.utils import UFs, CODES_UF
from vis.plots.home.vis_charts import historico_alerta_data_for
from datastore.models import Municipio
from registry.models import Prediction, PredictionDataRow


User = get_user_model()


np.seterr(divide="ignore", invalid="ignore")
warnings.filterwarnings(
    "ignore",
    message="divide by zero encountered in log",
    category=RuntimeWarning,
    module="scoringrules.backend.numpy",
)


def calculate_score(
    prediction_id: int,
    confidence_level: float = 0.9,
) -> dict[str, float]:
    prediction = Prediction.objects.get(id=prediction_id)

    scores = dict(
        mae=None,
        mse=None,
        crps=None,
        log_score=None,
        interval_score=None,
        wis=None,
    )

    data_df = hist_alerta_data(
        sprint=prediction.model.sprint,
        disease=prediction.model.disease,
        start_window_date=prediction.date_ini_prediction,
        end_window_date=prediction.date_end_prediction,
        adm_level=int(prediction.model.adm_level),
        adm_1=prediction.adm_1.uf if prediction.adm_1 else None,
        adm_2=int(prediction.adm_2.geocode) if prediction.adm_2 else None,
    )

    pred_df = prediction.to_dataframe()

    if data_df.empty or pred_df.empty:
        return scores

    data_df.rename(columns={"target": "casos"}, inplace=True)
    data_df = data_df[["date", "casos"]]
    data_df.date = pd.to_datetime(data_df.date)

    staff_user: User = User.objects.filter(is_staff=True).first()

    score = Scorer(staff_user.api_key, data_df, pred=pred_df)

    for s in ["mae", "mse", "crps", "log_score", "interval_score", "wis"]:
        scores[s] = score.summary[s]["pred"]

    return scores


def hist_alerta_data(
    sprint: bool,
    disease: str,
    start_window_date: date,
    end_window_date: date,
    adm_level: Literal[1, 2],
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
) -> pd.DataFrame:
    hist_alerta = historico_alerta_data_for(disease)

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
            data_iniSE__gte=start_window_date,
            data_iniSE__lte=end_window_date,
            municipio_geocodigo__in=geocodes,
        )
        .values("data_iniSE")
        .annotate(casos=models.Sum("casprov" if sprint else "casos"))
        .order_by("data_iniSE")
    )

    df = pd.DataFrame.from_records(data, columns=["data_iniSE", "casos"])
    df.rename(columns={"data_iniSE": "date", "casos": "target"}, inplace=True)
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
