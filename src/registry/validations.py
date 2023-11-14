import json
import re
from datetime import date
from pathlib import Path

app_dir = Path(__file__).parent

validation_data_path = app_dir / "data/IBGE_codes.json"

# Load the validation Brazilian geocodes, Municipalities and State names
with open(validation_data_path, "r") as validation_file:
    validation_data = json.load(validation_file)


def validate_commit(commit):
    # Check the hash commit length
    hash_size = 40
    if len(commit) != hash_size:
        return """Invalid commit: 
            The commit hash should be a 40-character string."""


def validate_description(description):
    # Check if the description meets your criteria (e.g., maximum length)
    max_length = 500
    if len(description) > max_length:
        return f"""Description too big, maximum allowed: {max_length}.
        Please remove {len(description) - max_length} characters."""


def validate_predict_date(predict_date):
    # Convert datetime.date object to string if it's not already a string
    predict_date_str = (
        predict_date.isoformat()
        if isinstance(predict_date, date)
        else predict_date
    )

    # Check if predict_date is a valid date with the format 'YYYY-MM-DD'
    date_pattern = re.compile(r"\d{4}-\d{2}-\d{2}")

    if not date_pattern.match(predict_date_str):
        return "Invalid predict_date format. Use YYYY-MM-DD."


def validate_prediction_obj(obj):
    """
    Validate prediction data according to specified criteria.

    Args:
        obj (list[dict]):List of prediction data entries.

    Raises:
        : If any validation check fails.

    Note:
        This function uses 'if not' to validate the data
        and raises status code with an error message
        if any validation fails.
    """
    for entry in obj:
        if not isinstance(entry.get("dates"), str):
            return "Invalid data type for 'dates' field."

        if not len(entry.get("dates")) == 10:
            return "Invalid length for 'dates' field."

        if not re.match(r"\d{4}-\d{2}-\d{2}", entry.get("dates")):
            return "Invalid 'dates' format."

        if not isinstance(entry.get("preds"), float):
            return "Invalid data type for 'preds' field."

        if not isinstance(entry.get("lower"), float):
            return "Invalid data type for 'lower' field."

        if not isinstance(entry.get("upper"), float):
            return "Invalid data type for 'upper' field."

        if not isinstance(entry.get("adm_2"), int):
            return "Invalid data type for 'adm_2' field."

        if not isinstance(entry.get("adm_1"), str):
            return "Invalid data type for 'adm_1' field."

        if not isinstance(entry.get("adm_0"), str):
            return "Invalid data type for 'adm_0' field."

        if not len(entry.get("adm_1")) == 2:
            return "Invalid length for 'adm_1' field."

        if not len(entry.get("adm_0")) == 2:
            return "Invalid length for 'adm_0' field."

        # Geocode validations
        date_pattern = r"\d{4}-\d{2}-\d{2}"
        if not re.match(date_pattern, entry.get("dates")):
            return "Invalid 'dates' format."

        if not (1100015 <= entry.get("adm_2") <= 5300108):
            return "Invalid value for 'adm_2' field."

        # Check if "geocodigo" is in validation_data
        geocodigo_values = [entry["geocodigo"] for entry in validation_data]
        if entry.get("adm_2") not in geocodigo_values:
            return "Invalid value for 'adm_2' field."


def validate_prediction(payload):
    # model = validate_model(payload.model)
    description_error = validate_description(payload.description)
    predict_date_error = validate_predict_date(payload.predict_date)
    commit_error = validate_commit(payload.commit)
    predict_obj_error = validate_prediction_obj(payload.prediction)

    if commit_error:
        return 404, {"message": commit_error}
    if description_error:
        return 404, {"message": description_error}
    if predict_date_error:
        return 404, {"message": predict_date_error}
    if predict_obj_error:
        return 404, {"message": predict_obj_error}
