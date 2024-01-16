from datetime import datetime as dt
from django.db.models import Sum
from typing import Dict, Union, List, Tuple
from django.db.models import Max
from main.utils import UFs
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
        raise ValueError("Unknown disease. Options: dengue, zika, chik")
    return data


def get_total_cases(disease: str, uf: str, year: int) -> TotalCases:
    """
    Gets total cases for a disease, uf and year. Saves the result if it hasn't
    been called before
    """
    disease = disease.lower()
    uf = uf.upper()
    year = int(year)

    if disease not in ["dengue", "chik", "chikungunya", "zika"]:
        raise ValueError("Unknown disease. Options: dengue, zika, chik")

    if uf not in UFs:
        raise ValueError(f"Unknown UF. Options are {list(UFs)}")

    if year < 1980 or year > dt.now().year:
        raise ValueError("Incorrect year. Min year: 1970")

    try:
        total_cases = TotalCases.objects.get(uf=uf, year=year, disease=disease)
    except TotalCases.DoesNotExist:
        data = historico_alerta_data_for(disease)
        uf_code = uf_ibge_mapping[uf]["code"]

        historico_alerta_total_cases = (
            data.filter(
                municipio_geocodigo__startswith=uf_code,
                data_iniSE__year=year,
            ).aggregate(total_cases=Sum("casos"))
        )["total_cases"]

        total_cases = TotalCases(
            uf=uf,
            year=year,
            disease=disease,
            total_cases=historico_alerta_total_cases,
        )
        total_cases.save()

    return total_cases


def get_total_cases_100k_hab(
    disease: str, uf: str, year: int
) -> TotalCases100kHab:
    """
    Gets total cases for a disease, uf and year using a 100k hab scale.
    Saves the result if it hasn't been called before
    """
    disease = disease.lower()
    uf = uf.upper()
    year = int(year)

    if disease not in ["dengue", "chik", "chikungunya", "zika"]:
        raise ValueError("Unknown disease. Options: dengue, zika, chik")

    if uf not in UFs:
        raise ValueError(f"Unknown UF. Options are {list(UFs)}")

    if year < 1970 or year > dt.now().year:
        raise ValueError("Incorrect year. Min year: 1970")

    try:
        total_cases = TotalCases100kHab.objects.get(
            uf=uf, year=year, disease=disease
        )
    except TotalCases100kHab.DoesNotExist:
        data = historico_alerta_data_for(disease)
        uf_code = uf_ibge_mapping[uf]["code"]

        historico_alerta_total_cases = (
            data.filter(
                municipio_geocodigo__startswith=uf_code,
                data_iniSE__year=year,
            ).aggregate(total_cases=Sum("casos"))
        )["total_cases"]

        historico_alerta_total_pop = (
            data.filter(
                municipio_geocodigo__startswith=uf_code,
                data_iniSE__year=year,
            ).aggregate(total_pop=Sum("pop"))
        )["total_pop"]

        cases_per_100k_hab = (
            historico_alerta_total_cases / historico_alerta_total_pop * 100000
        )

        total_cases = TotalCases100kHab(
            uf=uf,
            year=year,
            disease=disease,
            total_cases=float(f"{cases_per_100k_hab:.2f}"),
        )
        total_cases.save()

    return total_cases


def national_total_cases_data(
    disease: str, year: int, per_100k_hab: bool = False
) -> Tuple[List[Dict[str, Union[str, int]]], int]:
    """
    Get total cases for a disease of all states in a year.

    Returns:
        List[Dict[str, Union[str, int]]]: A list of dictionaries where each dictionary
            has "name" for the state name and "value" for the total cases.
        year: int
    """
    results = []
    disease = disease.lower()

    for uf_abbv in uf_ibge_mapping:
        state_name = uf_ibge_mapping[uf_abbv]["name"]
        if per_100k_hab:
            total_cases = get_total_cases_100k_hab(disease, uf_abbv, year)
        else:
            total_cases = get_total_cases(disease, uf_abbv, year)
        results.append({"name": state_name, "value": total_cases.total_cases})

    return sorted(results, key=lambda x: x["value"]), year


def get_last_available_year(uf: str, disease: str) -> int:
    """
    Gets the last year with data for a specific disease and UF.
    """
    disease = disease.lower()
    uf = uf.upper()

    if disease not in ["dengue", "chik", "chikungunya", "zika"]:
        raise ValueError("Unknown disease. Options: dengue, zika, chik")

    if uf not in UFs:
        raise ValueError(f"Unknown UF. Options are {list(UFs)}")

    try:
        last_available_year = TotalCases.objects.filter(
            uf=uf, disease=disease
        ).aggregate(last_year=Max("year"))["last_year"]
    except TotalCases.DoesNotExist:
        # Handle the case when no data is available
        last_available_year = None

    return last_available_year
