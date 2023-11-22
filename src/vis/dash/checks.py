import pandas as pd


def line_chart(df: pd.DataFrame) -> bool:
    """
    Returns True if a DataFrame can be visualized in a Line Chart
    """
    checks = []

    if _line_chart_df_columns(df):
        checks.append(True)

    if all(checks):
        return True
    return False


def _line_chart_df_columns(df: pd.DataFrame) -> bool:
    """
    Checks if a DataFrame has the minimum required to be visualized
    in a line chart
    """
    # TODO: These are the columns for the first models for visualization, it
    # will require a better handling in the future
    required_columns = [
        "dates",
        "preds",
        "lower",
        "upper",
        "adm_2",
        "adm_1",
        "adm_0",
    ]

    if not all(c in required_columns for c in df.columns):
        # TODO: improve error handling
        # raise errors.LineChartError("Incorrect columns")
        return False
    else:
        return True
    return False


def compatible_predictions(a, b) -> bool:
    """Compares two predictions to see if they can be visualized together"""
    return False
