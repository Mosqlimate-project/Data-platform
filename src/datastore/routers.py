from .models import HistoricoAlerta, CopernicusBrasil

ROUTED_MODELS = [HistoricoAlerta, CopernicusBrasil]


class WeatherRouter(object):
    """
    Router for schema "weather" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in ROUTED_MODELS:
            return "weather"
        return None


class MunicipioRouter(object):
    """
    Router for schema "Municipio" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in ROUTED_MODELS:
            return '"Municipio"'
        return None
