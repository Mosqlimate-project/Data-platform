import re
import json
from pathlib import Path

app_dir = Path(__file__).parent

validation_data_path = app_dir / "tests/data/validation_data.json"

# Load the validation Brazilian geocodes, Municipalities and State names
with open(validation_data_path, "r") as validation_file:
    validation_data = json.load(validation_file)


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
            breakpoint()
