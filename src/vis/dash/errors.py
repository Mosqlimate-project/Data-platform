class LineChartError(Exception):
    """
    Visualization for line chart failed.
    """

    def __init__(self, message):
        self.message = message

    def __str__(self):
        return repr(self.message)


class ComparisonError(Exception):
    """
    Visualization failed because there was a Comparison Error between two
    elements.
    """

    def __init__(self, message):
        self.message = message

    def __str__(self):
        return repr(self.message)


class NotFoundError(Exception):
    """
    Visualization failed because a Prediction weren't found
    """

    def __init__(self, message):
        self.message = message

    def __str__(self):
        return repr(self.message)
