from .models import (
    HistoricoAlerta,
    CopernicusBrasil,
    VegetationIndexMetric,
    Municipio,
    EpiscannerSirParams,
)

WEATHER_MODELS = [CopernicusBrasil]
MUNICIPIO_MODELS = [HistoricoAlerta]
VEG_INDICEDS_MODELS = [VegetationIndexMetric]
DENGUE_GLOBAL_MODELS = [Municipio]
EPISCANNER_MODELS = [EpiscannerSirParams]


class EpiscannerRouter(object):
    def db_for_read(self, model, **hints):
        if model in EPISCANNER_MODELS:
            return "episcanner"
        return None


class VegetationIndicesRouter(object):
    def db_for_read(self, model, **hints):
        if model in VEG_INDICEDS_MODELS:
            return "vegetation_indices"
        return None


class WeatherRouter(object):
    """
    Router for schema "weather" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in WEATHER_MODELS:
            return "weather"
        return None


class MunicipioRouter(object):
    """
    Router for schema "Municipio" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in MUNICIPIO_MODELS:
            return '"Municipio"'
        return None


class DengueGlobalRouter(object):
    """
    Router for schema "Dengue_global" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in DENGUE_GLOBAL_MODELS:
            return '"Dengue_global"'
        return None
