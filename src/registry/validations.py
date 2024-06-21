import json
import pandas as pd
from datetime import date, datetime, timedelta
from difflib import get_close_matches
from pathlib import Path
from urllib.parse import urlparse
from .models import ImplementationLanguage
from dateutil.parser import isoparse


def validate_commit(commit: str) -> str:
    """ """
    hash_size = 40
    if len(commit) != hash_size:
        return """Invalid commit: The provided commit hash has an 
        incorrect length. Please ensure you have captured the correct 
        commit using: 'git show --format=%H -s'
        """


def validate_date_format(date_str):
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def validate_description(description: str) -> str:
    """ """
    max_length = 500
    if len(description) > max_length:
        return f"""Description too big, maximum allowed: {max_length}.
        Please remove {len(description) - max_length} characters."""


def validate_predict_date(predict_date) -> str:
    """Validate the predict_date based on specified criteria.

    Args:
        predict_date (str or date): Predicted date or date object.

    Returns:
        str: Error message if any validation check fails, otherwise None.
    """
    if isinstance(predict_date, date):
        predict_date_str = predict_date.isoformat()
    else:
        predict_date_str = predict_date

    try:
        parsed_date = datetime.fromisoformat(predict_date_str).date()

        one_year_ago = date.today() - timedelta(days=365)
        if parsed_date < one_year_ago:
            return "Invalid predict_date. Should be at least one year ago."

        if parsed_date > date.today():
            return "Invalid predict_date. Cannot be in the future."

    except ValueError:
        return "Invalid predict_date format. Use YYYY-MM-DD."


def validate_prediction_obj(obj, adm_model, validation_regions) -> str:
    """Validate prediction data based on specified criteria.

    Args:
        obj (list[dict]): List of prediction data entries.
        model (int): id of the model to get the adm level associated
        validation_regions (list[dict]): List of regions used for additional
          validation, containing information about valid 'geocodigo'
          and 'uf_abbv' values and corresponding 'adm_levels'.

    Returns:
        str: Error message if any validation check fails, otherwise None.
    """

    required_keys = [
        "dates",
        "preds",
        "lower",
        "upper",
        f"adm_{adm_model}",
    ]

    # transform json in DataFrame for validation:
    try:
        df = pd.DataFrame(json.loads(json.dumps(obj)))
    except ValueError:
        return "json object can not be transformed in DataFrame."

    # Check if any key is missing
    if not set(required_keys).issubset(set(list(df.columns))):
        return (
            "Missing required keys in the entry: "
            f"{set(required_keys).difference(set(list(df.columns)))}"
        )

    # Check if all the rows of the required keys are filled
    if df[required_keys].isna().any().sum() != 0:
        return "Null values in one of the required keys: " f"{required_keys}"

    # date validation
    try:
        for value in df["dates"]:
            isoparse(value)

    except ValueError:
        return "Date values must be in the YYYY-MM-DD format."

    if min(pd.to_datetime(df.dates).dt.year) < 2010:
        return "Invalid 'dates' year. Should be equal to or bigger than 2010."

    # preds validation
    for field in ["preds", "lower", "upper"]:
        if not (
            pd.api.types.is_integer_dtype(df[field])
            or pd.api.types.is_float_dtype(df[field])
        ):
            return f"Invalid data type for '{field}' field."

    condition_preds = (df["lower"] < df["preds"]) & (df["preds"] < df["upper"])
    if not condition_preds.all():
        return """Invalid predictions, the predictions must follow:
          lower < preds < upper for all values."""

    if adm_model == 2:
        if len(df["adm_2"].unique()) != 1:
            return "The adm_2 must be filled with a unique value"

        try:
            adm_2_value = int(df["adm_2"].unique()[0])
        except ValueError:
            return "'adm_2' field must be int"
        if len(str(adm_2_value)) != 7:
            return "Invalid length, 'adm_2' field must have 7 digits."

        if adm_2_value not in [
            region["geocodigo"] for region in validation_regions
        ]:
            return "Invalid  geocode for 'adm_2' field."

    if adm_model == 1:
        if len(df["adm_1"].unique()) != 1:
            return "The adm_1 must be filled with a unique value"

        adm_1_value = df["adm_1"].unique()[0]
        if (
            not isinstance(adm_1_value, str)
            or len(str(adm_1_value)) != 2
            or adm_1_value
            not in [region["uf_abbv"] for region in validation_regions]
        ):
            return "Invalid data type, length, or UF abbv for 'adm_1' field."

    if adm_model == 0:
        if len(df["adm_2"].unique()) != 1:
            return "The adm_2 must be filled with a unique value"

        adm_0_value = df["adm_0"].unique()[0]
        if not isinstance(adm_0_value, str) or len(adm_0_value) != 2:
            return (
                "Invalid data type or length for 'adm_0' field. Format: 'BR'"
            )

    return None


def validate_prediction(payload: dict) -> tuple:
    """Validate the prediction input based on the provided payload.

    Args:
        payload (dict): The input payload containing the prediction data.

    Returns:
        tuple: A tuple containing the error message and the payload
        if any validation errors occur.
    """
    app_dir = Path(__file__).parent

    # Load the validation Brazilian geocodes, Municipalities and State names
    validation_regions_path = app_dir / "data/IBGE_codes.json"
    with open(validation_regions_path, "r") as f:
        validation_regions = json.load(f)

    # model = validate_model(payload.model)
    description_error = validate_description(payload.description)
    predict_date_error = validate_predict_date(payload.predict_date)
    commit_error = validate_commit(payload.commit)
    predict_obj_error = validate_prediction_obj(
        payload.prediction,
        payload.model.ADM_level,
        validation_regions,
    )

    if commit_error:
        return 422, {"message": commit_error}
    if description_error:
        return 422, {"message": description_error}
    if predict_date_error:
        return 422, {"message": predict_date_error}
    if predict_obj_error:
        return 422, {"message": predict_obj_error}


def validate_repository(repository: str) -> str:
    """ """
    repo_url = urlparse(repository)
    if repo_url.netloc != "github.com":  # TODO: add gitlab here?
        return "Model repository must be on Github"
    if not repo_url.path:
        return "Invalid repository"
    return None


def validate_ADM_level(ADM_level: int) -> str:
    """ """
    if ADM_level not in [0, 1, 2, 3]:
        return (
            "ADM_level must be 0, 1, 2 or 3 "
            "(National, State, Municipality, or Sub Municipality)"
        )
    return None


def validate_time_resolution(time_resolution: str) -> str:
    """ """
    if time_resolution not in ["day", "week", "month", "year"]:
        return 'Time resolution must be "day", "week", "month" or "year"'
    return None


def validate_implementation_language(implementation_language: str) -> tuple:
    """ """
    try:
        ImplementationLanguage.objects.get(
            language__iexact=implementation_language
        )
    except ImplementationLanguage.DoesNotExist:
        similar_lang = ImplementationLanguage.objects.values_list(
            "language", flat=True
        )
        matches = get_close_matches(implementation_language, similar_lang)
        if matches:
            return 404, {
                "message": (
                    f"Unknown language '{implementation_language}', "
                    f"did you mean '{matches[0]}'?"
                )
            }

        return 404, {
            "message": f"Unknown language '{implementation_language}'. "
            "Please select one of the following languages or open a "
            f"GitHub issue to suggest a new one: "
            f"{list(similar_lang)}"
        }

    return None


def validate_create_model(payload: dict) -> tuple:
    """Validate the create_model input based on the provided payload.

    Args:
        payload (dict): The input payload containing the create_model data.

    Returns:
        tuple: A tuple containing the error message and the payload
        if any validation errors occur.
    """
    repository_error = validate_repository(payload.repository)
    ADM_level_error = validate_ADM_level(payload.ADM_level)
    time_resolution_error = validate_time_resolution(payload.time_resolution)
    description_error = validate_description(payload.description)

    if repository_error:
        return 403, {"message": repository_error}
    if ADM_level_error:
        return 422, {"message": ADM_level_error}
    if time_resolution_error:
        return 422, {"message": time_resolution_error}
    if description_error:
        return 403, {"message": description_error}

    return None
