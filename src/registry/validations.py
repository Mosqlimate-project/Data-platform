import json
from datetime import date, datetime, timedelta
from difflib import get_close_matches
from pathlib import Path
from urllib.parse import urlparse

from .models import ImplementationLanguage


def validate_commit(commit: str) -> str:
    """ """
    hash_size = 40
    if len(commit) != hash_size:
        return """Invalid commit: The provided commit hash has an 
        incorrect length. Please ensure you have captured the correct 
        commit using: 'git show --format=%H -s'
        """


def validate_description(description: str) -> str:
    """ """
    max_length = 500
    if len(description) > max_length:
        return f"""Description too big, maximum allowed: {max_length}.
        Please remove {len(description) - max_length} characters."""


def validate_predict_date(predict_date: str) -> str:
    """Validate the predict_date based on specified criteria.

    Args:
        predict_date (str): Predicted date or date object. Format: YYYY-mm-dd

    Returns:
        str: Error message if any validation check fails, otherwise None.
    """
    try:
        # Use date.fromisoformat to parse the date
        parsed_date = date.fromisoformat(predict_date)
    except ValueError:
        return "Invalid predict_date format. Use YYYY-MM-DD."

    # Check if the parsed date is at least one year ago
    one_year_ago = date.today() - timedelta(days=365)
    if parsed_date < one_year_ago:
        return "Invalid predict_date. Should be at least one year ago."

    # Check if the parsed date is not in the future
    if parsed_date > date.today():
        return "Invalid predict_date. Cannot be in the future."

    return None


def validate_prediction_obj(obj, validation_regions) -> str:
    """Validate prediction data based on specified criteria.

    Args:
        obj (list[dict]): List of prediction data entries.
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
        "adm_2",
        "adm_1",
        "adm_0",
    ]

    for entry in obj:
        # Check if any key is missing
        if set(required_keys) != set(entry):
            return (
                "Missing required keys in the entry: "
                f"{set(required_keys).difference(set(entry))}"
            )

        # "dates" validation
        date_value = entry.get("dates")
        try:
            # Use date.fromisoformat to parse the date
            parsed_date = date.fromisoformat(date_value)
        except ValueError:
            return "Invalid date format on column 'dates'. Use 'YYYY-MM-DD'."

        # Check if the year is within a valid range (2010 to current year)
        current_year = datetime.now().year
        if not 2010 <= parsed_date.year <= current_year:
            return """\n
                Invalid 'dates' year. Should be between 2010 
                and the current year.
            """

        # Check if the parsed date is not in the future
        if parsed_date > date.today():
            return "Invalid 'dates'. Cannot be in the future."

        for field in ["preds", "lower", "upper"]:
            if not isinstance(entry.get(field), float):
                return f"Invalid data type for '{field}' field."

        adm_2_value = entry.get("adm_2")
        if (
            not isinstance(adm_2_value, int)
            or len(str(adm_2_value)) != 7
            or adm_2_value
            not in [region["geocodigo"] for region in validation_regions]
        ):
            return "Invalid data type, length, or geocode for 'adm_2' field."

        adm_1_value = entry.get("adm_1")
        if (
            not isinstance(adm_1_value, str)
            or len(str(adm_1_value)) != 2
            or adm_1_value
            not in [region["uf_abbv"] for region in validation_regions]
        ):
            return "Invalid data type, length, or UF abbv for 'adm_1' field."

        adm_0_value = entry.get("adm_0")
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
        json.loads(str(payload.prediction)), validation_regions
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
