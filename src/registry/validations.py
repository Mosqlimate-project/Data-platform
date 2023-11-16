import json
import re
from datetime import date
from pathlib import Path


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
    # Convert datetime.date object to string if it's not already a string
    predict_date_str = (
        predict_date.isoformat() if isinstance(predict_date, date) else predict_date
    )

    # Check if predict_date is a valid date with the format 'YYYY-MM-DD'
    date_pattern = re.compile(r"\d{4}-\d{2}-\d{2}")

    if not date_pattern.match(predict_date_str):
        return "Invalid predict_date format. Use YYYY-MM-DD."


def validate_prediction_obj(obj, validation_regions):
    """
    Validate prediction data according to specified criteria.

    Args:
        obj (list[dict]): List of prediction data entries.
        validation_regions (list[dict]): List of valid regions for geocodes.

    Raises:
        ValueError: If any validation check fails.
    """
    date_pattern = r"\d{4}-\d{2}-\d{2}"

    for entry in obj:
        # "dates" validation
        dates_value = entry.get("dates")
        if (
            not isinstance(dates_value, str)
            or len(dates_value) != 10
            or not re.match(date_pattern, dates_value)
        ):
            return "Invalid data type, length, or format for 'dates' field."

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
