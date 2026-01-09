from datetime import date
from typing import Optional, Literal

import pandas as pd
from django.db.models import Sum
from django.contrib.auth import get_user_model
from mosqlient.scoring.score import Scorer

from main.utils import UF_CODES
from datastore.models import (
    Adm2,
    HistoricoAlerta,
    HistoricoAlertaChik,
    HistoricoAlertaZika,
)
from registry.models import QuantitativePrediction


User = get_user_model()


def hist_alerta_data(
    sprint: bool,
    disease: str,
    start_window_date: date,
    end_window_date: date,
    adm_level: Literal[1, 2],
    adm_1: Optional[str] = None,
    adm_2: Optional[int] = None,
) -> pd.DataFrame:
    if disease in ["chik", "chikungunya"]:
        hist_alerta = HistoricoAlertaChik.objects.using("infodengue")
    elif disease in ["deng", "dengue"]:
        hist_alerta = HistoricoAlerta.objects.using("infodengue")
    elif disease == "zika":
        hist_alerta = HistoricoAlertaZika.objects.using("infodengue")
    else:
        raise ValueError("Unknown disease")

    if str(adm_level) == "1":
        if not str(adm_1).isdigit():
            adm_1 = UF_CODES[adm_1]

        geocodes = list(
            Adm2.objects.filter(adm1=adm_1).values_list("geocode", flat=True)
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
        .annotate(casos=Sum("casprov" if sprint else "casos"))
        .order_by("data_iniSE")
    )

    df = pd.DataFrame.from_records(data, columns=["data_iniSE", "casos"])
    df.rename(columns={"data_iniSE": "date", "casos": "target"}, inplace=True)
    df["date"] = pd.to_datetime(df["date"])
    df["legend"] = "Data"
    return df


def calculate_score(
    prediction_id: int,
    confidence_level: float = 0.9,
) -> dict[str, float]:
    prediction = QuantitativePrediction.objects.get(id=prediction_id)

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
    pred_df = pred_df.dropna(axis=1)

    if data_df.empty or pred_df.empty:
        return scores

    data_df.rename(columns={"target": "casos"}, inplace=True)
    data_df = data_df[["date", "casos"]]
    data_df.date = pd.to_datetime(data_df.date)

    staff_user: User = User.objects.filter(is_staff=True).first()

    score = Scorer(staff_user.api_key, df_true=data_df, pred=pred_df)

    for s in ["mae", "mse", "crps", "log_score", "interval_score", "wis"]:
        scores[s] = score.summary[s]["pred"]

    return scores
