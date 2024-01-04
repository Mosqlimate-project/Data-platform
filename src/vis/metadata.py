from datetime import datetime

DISEASES = {"dengue": "01", "zika": "02", "chikungunya": "03"}

TIME_RESOLUTIONS = {
    "day": "D",
    "week": "W",
    "month": "M",
    "year": "Y",
}

ADM_LEVELS = {
    0: "NA",
    1: "ST",
    2: "MU",
    3: "SM",
}


def compose_prediction_metadata(prediction) -> str:
    """
    Convert the Prediction specifications into a ID to be used to extract
    its information across the platform. ID example:

    01DMU-11Q-3304557-1388775707-1704301311
    - Dengue / Daily / ADM Level 2
    - Spatio-Temporal Quantitative
    - Rio de Janeiro - RJ
    - Jan 03 2014 until Jan 03 2024

    Parameters
    ----------
    prediction: a Prediction model object from Registry app

    Return
    ------
    a Metadata hash as string
    """

    disease = DISEASES[prediction.model.disease.lower()]
    time_res = TIME_RESOLUTIONS[prediction.model.time_resolution.lower()]
    adm_level = ADM_LEVELS[prediction.model.ADM_level]

    spatial = "1" if prediction.model.spatial else "0"
    temporal = "1" if prediction.model.temporal else "0"
    categorical_quantitative = "C" if prediction.model.categorical else "Q"

    match prediction.model.ADM_level:
        case 0:
            code = prediction.adm_0_geocode
        case 1:
            code = prediction.adm_1_geocode
        case 2:
            code = prediction.adm_2_geocode
        case 3:
            code = prediction.adm_3_geocode

    if not code:
        raise ValueError(
            "Invalid geolocation code for ADM Level "
            f"{prediction.model.ADM_level}"
        )

    ini_timestamp = int(prediction.date_ini_prediction.timestamp())
    end_timestamp = int(prediction.date_end_prediction.timestamp())

    return "-".join(
        [
            "".join((disease, time_res, adm_level)),
            "".join((spatial, temporal, categorical_quantitative)),
            str(code),
            str(ini_timestamp),
            str(end_timestamp),
        ]
    )


def decompose_prediction_metadata(hash: str) -> tuple:
    metadata = dict()

    dtra, stc, code, ini, end = hash.split("-")
    d, tr, a = dtra[:2], dtra[2], dtra[-2:]
    s, t, c = stc

    diseases = {v: k for k, v in DISEASES.items()}
    time_res = {v: k for k, v in TIME_RESOLUTIONS.items()}
    adm_levels = {v: k for k, v in ADM_LEVELS.items()}

    metadata["disease"] = diseases[d]
    metadata["time_resolution"] = time_res[tr]
    metadata["ADM_level"] = adm_levels[a]

    metadata["spatial"] = bool(int(s))
    metadata["temporal"] = bool(int(t))
    metadata["categorical"] = True if c == "C" else False

    if not code.isdigit() and len(code) == 3:
        metadata["adm_0_geocode"] = code
    elif code.isdigit() and len(code) == 2:
        metadata["adm_1_geocode"] = code
    elif code.isdigit() and len(code) == 7:
        metadata["adm_2_geocode"] = code
    else:
        metadata["adm_3_geocode"] = code  # TODO: find pattern for adm_level 3

    metadata["date_ini_prediction"] = datetime.fromtimestamp(int(ini))
    metadata["date_end_prediction"] = datetime.fromtimestamp(int(end))

    return metadata
