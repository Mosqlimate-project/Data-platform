from .models import HistoricoAlerta

ROUTED_MODELS = [HistoricoAlerta]


class MunicipioRouter(object):
    """
    Router for schema "Municipio" in infodengue postgres database
    """

    def db_for_read(self, model, **hints):
        if model in ROUTED_MODELS:
            return '"Municipio"'
        return None
