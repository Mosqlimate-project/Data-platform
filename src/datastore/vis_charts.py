import pendulum
from datastore.models import HistoricoAlerta

# from main.utils import UFs, // TODO UPDATE THE DICTIONARY
from django.db.models import Sum
from typing import Dict, List, Union

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


def cases_uf_by_year(uf_abbv: str, year: int) -> List[Dict[str, Union[str, int]]]:
    """
    Get the total cases for a state in a given year.

    Args:
        uf_abbv (str): The state abbreviation.
        year (int): The year for which to retrieve the data.

    Returns:
        List[Dict[str, Union[str, int]]]: A list of dictionaries containing the state
        abbreviation and the total number of cases for the specified year.
    """
    uf_code = uf_ibge_mapping.get(uf_abbv)["code"]

    resultado = (
        HistoricoAlerta.objects.using("infodengue")
        .filter(data_iniSE__year=year, municipio_geocodigo__startswith=uf_code)
        .values("data_iniSE__year")
        .annotate(total_cases=Sum("casos"))
    )

    result_list = [{uf_abbv: item["total_cases"]} for item in resultado]

    return result_list


def get_data() -> List[List[Dict[str, Union[str, int]]]]:
    """
    Get total cases for all states in the current year.

    Returns:
        List[List[Dict[str, Union[str, int]]]]: A list of lists,
        where each inner list contains dictionaries with state
        abbreviations and total cases for the current year.
    """
    current_year = pendulum.now().year
    ufs_abbv = [k for k in uf_ibge_mapping]
    results = []

    for uf in ufs_abbv:
        result = cases_uf_by_year(uf, current_year)
        results.append(result)

    return results
