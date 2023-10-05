# from main.utils import UFs, // TODO UPDATE THE DICTIONARY
from datetime import datetime as dt
from datastore.models import HistoricoAlerta
from django.db.models import Sum
from typing import Dict, Union, List
from django.core.cache import cache
from django.db.models import Max


# Mapping between state abbreviations and IBGE codes
uf_ibge_mapping: Dict[str, Dict[str, str]] = {
    "AC": {"code": "12", "name": "Acre"},
    "AL": {"code": "27", "name": "Alagoas"},
    "AM": {"code": "13", "name": "Amazonas"},
    "AP": {"code": "16", "name": "Amapá"},
    "BA": {"code": "29", "name": "Bahia"},
    "CE": {"code": "23", "name": "Ceará"},
    "DF": {"code": "53", "name": "Distrito Federal"},
    "ES": {"code": "32", "name": "Espírito Santo"},
    "GO": {"code": "52", "name": "Goiás"},
    "MA": {"code": "21", "name": "Maranhão"},
    "MG": {"code": "31", "name": "Minas Gerais"},
    "MS": {"code": "50", "name": "Mato Grosso do Sul"},
    "MT": {"code": "51", "name": "Mato Grosso"},
    "PA": {"code": "15", "name": "Pará"},
    "PB": {"code": "25", "name": "Paraíba"},
    "PE": {"code": "26", "name": "Pernambuco"},
    "PI": {"code": "22", "name": "Piauí"},
    "PR": {"code": "41", "name": "Paraná"},
    "RJ": {"code": "33", "name": "Rio de Janeiro"},
    "RN": {"code": "24", "name": "Rio Grande do Norte"},
    "RO": {"code": "11", "name": "Rondônia"},
    "RR": {"code": "14", "name": "Roraima"},
    "RS": {"code": "43", "name": "Rio Grande do Sul"},
    "SC": {"code": "42", "name": "Santa Catarina"},
    "SE": {"code": "28", "name": "Sergipe"},
    "SP": {"code": "35", "name": "São Paulo"},
    "TO": {"code": "17", "name": "Tocantins"},
}

# Mapping of IBGE codes to state abbreviations
municipio_uf_mapping: Dict[str, str] = {
    value["code"]: key for key, value in uf_ibge_mapping.items()
}

# Mapping of IBGE codes to state names
municipio_estado_mapping: Dict[str, str] = {
    value["code"]: value["name"] for value in uf_ibge_mapping.values()
}


def get_data() -> List[Dict[str, Union[str, int]]]:
    """
    Get total cases for all states in the current year.

    Returns:
        List[Dict[str, Union[str, int]]]: A list of dictionaries where each dictionary
        has "name" for the state name and "value" for the total cases.
    """
    current_year = dt.now().year
    results = []

    # Calculate the maximum date for the given year for all states in a single query
    max_dates = (
        HistoricoAlerta.objects.using("infodengue")
        .filter(data_iniSE__year=current_year)
        .values("municipio_geocodigo")
        .annotate(max_date=Max("data_iniSE"))
    )

    # Create a cache key for the maximum date, which is common to all states
    max_date_cache_key = f"max_date_{current_year}"
    cached_max_date = cache.get(max_date_cache_key)

    if cached_max_date is None:
        # If max date is not in the cache, set it and cache it with a reasonable timeout
        cached_max_date = max_dates[0]["max_date"] if max_dates else None
        cache.set(max_date_cache_key, cached_max_date, 3600)

    for uf_abbv in uf_ibge_mapping:
        # Create a cache key specific to the state and maximum date
        cache_key = f"cases_{uf_abbv}_{cached_max_date}"

        # Attempt to retrieve data from the cache
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            # Convert the state abbreviation to the IBGE code
            # ibge_code = uf_ibge_mapping[uf_abbv]["code"]
            state_name = uf_ibge_mapping[uf_abbv]["name"]
            results.append({"name": state_name, "value": cached_data})
        else:
            uf_code = uf_ibge_mapping[uf_abbv]["code"]
            total_cases = (
                HistoricoAlerta.objects.using("infodengue")
                .filter(
                    municipio_geocodigo__startswith=uf_code,
                    data_iniSE__startswith=current_year,
                )
                .aggregate(total_cases=Sum("casos"))
            )["total_cases"]

            # Convert the state abbreviation to the IBGE code
            # ibge_code = uf_ibge_mapping[uf_abbv]["code"]
            state_name = uf_ibge_mapping[uf_abbv]["name"]
            results.append({"name": state_name, "value": total_cases})

            cache.set(cache_key, total_cases, 3600)

    return results, current_year
