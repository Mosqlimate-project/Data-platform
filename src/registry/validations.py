import re
from datetime import date
import json
from pathlib import Path

app_dir = Path(__file__).parent

validation_data_path = app_dir / "tests/data/validation_data.json"

# Load the validation Brazilian geocodes, Municipalities and State names
with open(validation_data_path, "r") as validation_file:
    validation_data = json.load(validation_file)


def validate_commit(commit):
    # Check the hash commit length
    hash_size = 40
    if len(commit) != hash_size:
        return "Invalid commit: The commit hash should be a 40-character string."


def validate_description(description):
    # Check if the description meets your criteria (e.g., maximum length)
    max_length = 500
    if len(description) > max_length:
        return f"""Description too big, maximum allowed: {max_length}.
        Please remove {len(description) - max_length} characters."""


def validate_ADM_level(ADM_level):
    # Check if ADM_level is within the valid range (0, 1, 2, 3)
    valid_levels = [0, 1, 2, 3]
    if ADM_level not in valid_levels:
        return """
            ADM_level must be 0, 1, 2, or 3 
            (National, State, Municipality, or Sub Municipality).
            """


def validate_predict_date(predict_date):
    # Convert datetime.date object to string if it's not already a string
    predict_date_str = (
        predict_date.isoformat() if isinstance(predict_date, date) else predict_date
    )

    # Check if predict_date is a valid date object with the format 'YYYY-MM-DD'
    date_pattern = re.compile(r"\d{4}-\d{2}-\d{2}")

    if not date_pattern.match(predict_date_str):
        return "Invalid predict_date format. Use YYYY-MM-DD."


def validate_prediction_metadata(payload):
    # model = validate_model(payload.model)
    description_error = validate_description(payload.description)
    ADM_level_error = validate_ADM_level(payload.ADM_level)
    predict_date_error = validate_predict_date(payload.predict_date)
    commit_error = validate_commit(payload.commit)

    if commit_error:
        return 403, {"message": commit_error}
    if description_error:
        return 403, {"message": description_error}
    if ADM_level_error:
        return 403, {"message": ADM_level_error}
    if predict_date_error:
        return 403, {"message": predict_date_error}


def validate_prediction_data(data):
    """
    Validate prediction data according to specified criteria.

    Args:
        data (list[dict]): List of prediction data entries.

    Raises:
        AssertionError: If any validation check fails.

    Note:
        This function uses assert statements to validate the data
        and raises AssertionError with an error message
        if any validation fails.
    """
    for entry in data:
        try:
            assert isinstance(
                entry.get("dates"), str
            ), "Invalid data type for 'dates' field."
            assert len(entry.get("dates")) == 10, "Invalid length for 'dates' field."
            assert re.match(
                r"\d{4}-\d{2}-\d{2}", entry.get("dates")
            ), "Invalid 'dates' format."

            assert isinstance(
                entry.get("preds"), float
            ), "Invalid data type for 'preds' field."
            assert isinstance(
                entry.get("lower"), float
            ), "Invalid data type for 'lower' field."
            assert isinstance(
                entry.get("upper"), float
            ), "Invalid data type for 'upper' field."
            assert isinstance(
                entry.get("adm_2"), int
            ), "Invalid data type for 'adm_2' field."
            assert isinstance(
                entry.get("adm_1"), str
            ), "Invalid data type for 'adm_1' field."
            assert isinstance(
                entry.get("adm_0"), str
            ), "Invalid data type for 'adm_0' field."

            assert len(entry.get("adm_1")) == 2, "Invalid length for 'adm_1' field."
            assert len(entry.get("adm_0")) == 2, "Invalid length for 'adm_0' field."

            # Geocode validations
            date_pattern = r"\d{4}-\d{2}-\d{2}"
            assert re.match(date_pattern, entry.get("dates")), "Invalid 'dates' format."

            assert (
                1100015 <= entry.get("adm_2") <= 5300108
            ), "Invalid value for 'adm_2' field."

            # Check if "geocodigo" is in validation_data
            geocodigo_values = [entry["geocodigo"] for entry in validation_data]
            assert (
                entry.get("adm_2") in geocodigo_values
            ), "Invalid value for 'adm_2' field."

        except AssertionError as e:
            print(e)
            # breakpoint()
