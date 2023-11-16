import json
from pathlib import Path
from datetime import datetime, date, timedelta


def validate_commit(commit):
    # Check the hash commit length
    hash_size = 40
    if len(commit) != hash_size:
        return """Invalid commit: The provided commit hash has an incorrect length.
            Please ensure you have captured the latest commit using:
            'git show --format=%H -s'
            """


def validate_description(description):
    # Check if the description meets your criteria (e.g., maximum length)
    max_length = 500
    if len(description) > max_length:
        return f"""Description too big, maximum allowed: {max_length}.
        Please remove {len(description) - max_length} characters."""


def validate_predict_date(predict_date):
    """
    Validate predict_date according to specified criteria.

    Args:
        predict_date (str or date): Predicted date or date object.

    Returns:
        str: Error message if any validation check fails, otherwise None.
    """
    # Convert datetime.date object to string if it's not already a string
    predict_date_str = (
        predict_date.isoformat() if isinstance(predict_date, date) else predict_date
    )

    try:
        # Use datetime.fromisoformat to parse the date
        parsed_date = datetime.fromisoformat(predict_date_str).date()

        # Check if the parsed date is at least one year ago
        one_year_ago = date.today() - timedelta(days=365)
        if parsed_date < one_year_ago:
            return "Invalid predict_date. Should be at least one year ago."

        # Check if the parsed date is not in the future
        if parsed_date > date.today():
            return "Invalid predict_date. Cannot be in the future."

    except ValueError:
        return "Invalid predict_date format. Use YYYY-MM-DD."

    return None


def validate_prediction_obj(obj, validation_regions):
    """
    Validate prediction data according to specified criteria.

    Args:
        obj (list[dict]): List of prediction data entries.
        validation_regions (list[dict]): List of valid regions for geocodes.

    Raises:
        ValueError: If any validation check fails.
    """

    for entry in obj:
        # "dates" validation
        dates_value = entry.get("dates")
        if not isinstance(dates_value, str) or len(dates_value) != 10:
            return "Invalid data type or length for 'dates' field."

        try:
            # Use datetime.fromisoformat to parse the date
            parsed_date = datetime.fromisoformat(dates_value)

            # Check if the year is within a valid range (2010 to current year)
            current_year = datetime.now().year
            if not 2010 <= parsed_date.year <= current_year:
                return (
                    "Invalid 'dates' year. Should be between 2010 and the current year."
                )

            # Check if the parsed date is not in the future
            if parsed_date.date() > date.today():
                return "Invalid 'dates'. Cannot be in the future."

        except ValueError:
            return "Invalid 'dates' format. Use YYYY-MM-DD."

        # "preds", "lower", "upper" validation
        for field in ["preds", "lower", "upper"]:
            if not isinstance(entry.get(field), float):
                return f"Invalid data type for '{field}' field."

        # "adm_2": geocode validation
        adm_2_value = entry.get("adm_2")
        if (
            not isinstance(adm_2_value, int)
            or len(str(adm_2_value)) != 7
            or adm_2_value not in [region["geocodigo"] for region in validation_regions]
        ):
            return "Invalid data type, length, or geocode for 'adm_2' field."

        # "adm_1": UF abbv validation
        adm_1_value = entry.get("adm_1")
        if (
            not isinstance(adm_1_value, str)
            or len(str(adm_1_value)) != 2
            or adm_1_value not in [region["uf_abbv"] for region in validation_regions]
        ):
            return "Invalid data type, length, or UF abbv for 'adm_1' field."

        # "adm_0": Country code ## TODO: Change to ISO code
        adm_0_value = entry.get("adm_0")
        if not isinstance(adm_0_value, str) or len(adm_0_value) != 2:
            return "Invalid data type or length for 'adm_0' field."

    # Return None if all validations pass
    return None


def validate_prediction(payload):
    app_dir = Path(__file__).parent

    validation_regions_path = app_dir / "data/IBGE_codes.json"

    # Load the validation Brazilian geocodes, Municipalities and State names
    with open(validation_regions_path, "r") as f:
        validation_regions = json.load(f)

    # model = validate_model(payload.model)
    description_error = validate_description(payload.description)
    predict_date_error = validate_predict_date(payload.predict_date)
    commit_error = validate_commit(payload.commit)
    predict_obj_error = validate_prediction_obj(payload.prediction, validation_regions)

    if commit_error:
        return 404, {"message": commit_error}
    if description_error:
        return 404, {"message": description_error}
    if predict_date_error:
        return 404, {"message": predict_date_error}
    if predict_obj_error:
        return 404, {"message": predict_obj_error}
