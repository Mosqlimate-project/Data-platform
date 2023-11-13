from datetime import datetime as dt
from django.db.models import Sum
from typing import Dict, Union, List
from django.core.cache import cache
from django.db.models import Max

from datastore.models import (
    HistoricoAlerta,
    HistoricoAlertaChik,
    HistoricoAlertaZika,
)
from vis.models import TotalCases, TotalCases100kHab


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


def historico_alerta_data_for(
    disease: str,
) -> Union[HistoricoAlerta, HistoricoAlertaChik, HistoricoAlertaZika]:
    """
    Gets the correct HistoricoAlerta model's data for the specific disease
    """
    if disease in ["chik", "chikungunya"]:
        data = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        data = HistoricoAlerta.objects.using("infodengue").all()
    elif disease == "zika":
        data = HistoricoAlertaZika.objects.using("infodengue").all()
    else:
        raise KeyError("Unknown disease. Options: dengue, zika, chik")
    return data


def get_total_cases(disease: str, uf: str, year: int) -> TotalCases:
    ...


def get_total_cases_100k_hab(
    disease: str, uf: str, year: int
) -> TotalCases100kHab:
    ...


def get_data(disease: str) -> List[Dict[str, Union[str, int]]]:
    """
    Get total cases for a disease of all states in the current year.

    Returns:
        List[Dict[str, Union[str, int]]]: A list of dictionaries where each dictionary
        has "name" for the state name and "value" for the total cases.
    """
    current_year = dt.now().year
    results = []

    disease = disease.lower()

    if disease in ["chik", "chikungunya"]:
        data = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        data = HistoricoAlerta.objects.using("infodengue").all()
    elif disease == "zika":
        data = HistoricoAlertaZika.objects.using("infodengue").all()
    else:
        raise KeyError("Unknown disease. Options: dengue, zika, chik")

    max_dates = (
        data.filter(data_iniSE__year=current_year)
        .values("municipio_geocodigo")
        .annotate(max_date=Max("data_iniSE"))
    )

    max_date_cache_key = f"max_date_{current_year}_{disease}"
    cached_max_date = cache.get(max_date_cache_key)

    if cached_max_date is None:
        cached_max_date = max_dates[0]["max_date"] if max_dates else None
        cache.set(max_date_cache_key, cached_max_date, 3600)

    for uf_abbv in uf_ibge_mapping:
        cache_key = f"cases_{uf_abbv}_{cached_max_date}_{disease}"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            state_name = uf_ibge_mapping[uf_abbv]["name"]
            results.append({"name": state_name, "value": cached_data})
        else:
            uf_code = uf_ibge_mapping[uf_abbv]["code"]
            total_cases = (
                data.filter(
                    municipio_geocodigo__startswith=uf_code,
                    data_iniSE__startswith=current_year,
                ).aggregate(total_cases=Sum("casos"))
            )["total_cases"]

            state_name = uf_ibge_mapping[uf_abbv]["name"]
            results.append({"name": state_name, "value": total_cases})

            cache.set(cache_key, total_cases, 86400)

    return results, current_year
