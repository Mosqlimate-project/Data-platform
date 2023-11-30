import pandas as pd


def line_chart_adm2(df: pd.DataFrame) -> bool:
    """
    Returns True if a DataFrame can be visualized in a Line Chart by Municipality
    """
    checks = []

    if _line_chart_adm_2_df_columns(df):
        checks.append(True)

    if _line_chart_adm_2_geocodigo(df):
        checks.append(True)

    if all(checks) and checks:
        return True

    return False


def _line_chart_adm_2_df_columns(df: pd.DataFrame) -> bool:
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

    if df.empty:
        return False

    if "target" in df.columns:
        # Ignore target column
        df = df.drop("target", axis=1)

    if set(df.columns) != set(required_columns):
        # TODO: improve error handling
        # raise errors.LineChartError("Incorrect columns")
        print("not same columns")
        return False
    else:
        return True

    return False


def _line_chart_adm_2_geocodigo(df: pd.DataFrame) -> bool:
    """
    Checks if the DataFrame contains a geocode in the column `adm_2`
    """
    try:
        geocode = df["adm_2"].unique()
    except KeyError:
        return False

    if len(geocode) != 1:
        return False

    geocode = geocode[0]

    if len(str(geocode)) != 7:
        return False

    # TODO: check if geocode exists here
    return True


def compatible_predictions(a, b) -> bool:
    """Compares two predictions to see if they can be visualized together"""
    return False
