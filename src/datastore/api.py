import datetime
import requests
from typing import List, Literal, Optional

import duckdb
import pandas as pd

from ninja import Router, Query
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError
from django.conf import settings

from main.schema import NotFoundSchema, InternalErrorSchema
from main.utils import UFs
from registry.pagination import PagesPagination
from .models import (
    DengueGlobal,
    HistoricoAlerta,
    HistoricoAlertaZika,
    HistoricoAlertaChik,
    CopernicusBrasil,
)
from .schema import (
    HistoricoAlertaSchema,
    HistoricoAlertaFilterSchema,
    CopernicusBrasilSchema,
    CopernicusBrasilFilterSchema,
    ContaOvosSchema,
    EpiScannerSchema,
)


router = Router()

paginator = PagesPagination
paginator.max_per_page = 100


@router.get(
    "/infodengue/",
    response={
        200: List[HistoricoAlertaSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_infodengue(
    request,
    disease: Literal["dengue", "zika", "chik"],
    filters: HistoricoAlertaFilterSchema = Query(...),
    # fmt: off
    uf: Optional[Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]] = None,
    # fmt: on
    **kwargs,
):
    disease = disease.lower()  # pyright: ignore

    try:
        if disease in ["chik", "chikungunya"]:
            data = HistoricoAlertaChik.objects.using("infodengue").all()
        elif disease in ["deng", "dengue"]:
            data = HistoricoAlerta.objects.using("infodengue").all()
        elif disease == "zika":
            data = HistoricoAlertaZika.objects.using("infodengue").all()
        else:
            return 404, {
                "message": "Unknown disease. Options: dengue, zika, chik"
            }
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()  # pyright: ignore
        if uf not in list(UFs):
            return 404, {"message": "Unkown UF. Format: SP"}
        uf_name = UFs[uf]
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(municipio_geocodigo__in=geocodes)

    data = filters.filter(data)
    return data.order_by("-data_iniSE")


@router.get(
    "/climate/",
    response={
        200: List[CopernicusBrasilSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil(
    request,
    filters: CopernicusBrasilFilterSchema = Query(...),
    # fmt: off
    uf: Optional[Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ]] = None,
    # fmt: on
    **kwargs,
):
    try:
        data = CopernicusBrasil.objects.using("infodengue").all()
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()  # pyright: ignore
        if uf not in list(UFs):
            return 404, {"message": "Unkown UF. Format: SP"}
        uf_name = UFs[uf]
        geocodes = (
            DengueGlobal.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(geocodigo__in=geocodes)

    data = filters.filter(data)
    return data


@router.get(
    "/mosquito/",
    response={
        200: List[ContaOvosSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "contaovos"],
)
@csrf_exempt
def get_contaovos(request, key: str, page: int):
    url = "https://contaovos.dengue.mat.br/pt-br/api/lastcounting"
    params = {"key": key, "page": page}
    response = requests.get(url, params=params, timeout=20)

    if response.status_code == 200:
        return 200, [ContaOvosSchema(**i) for i in response.json()]

    if response.status_code == 500:
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }

    return 404, {"message": response.json()}


@router.get(
    "/episcanner/",
    response={
        200: List[EpiScannerSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    tags=["datastore", "episcanner"],
)
@csrf_exempt
def get_episcanner(
    request,
    # fmt: off
    disease: Literal["dengue", "zika", "chik"],
    uf: Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ],
    # fmt: on
    year: int = datetime.datetime.now().year,
    # geocode: Optional[List[int]] = None
):
    db = duckdb.connect(
        str(
            settings.DJANGO_CONTAINER_DATA_PATH
            / "episcanner"
            / "episcanner.duckdb"
        )
    )

    describe: pd.DataFrame = db.execute("DESCRIBE").fetchdf()

    if describe.empty:
        print("Duckdb data not found while trying to retrieve EpiScanner data")
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }

    sql = f"SELECT * FROM '{uf}' WHERE disease = '{disease}' AND year = {year}"

    try:
        df = db.execute(sql).fetchdf()
    except duckdb.CatalogException as e:
        print(f"Duckdb error executing sql {sql}\n{e}")
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }
    except duckdb.IOException as e:
        print(f"Duckdb IO error: {e}")
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }
    finally:
        db.close()

    if df.empty:
        return 404, {
            "message": (
                "No data for specific query "
                f"(disease={disease}, uf={uf}, year={year})"
            )
        }

    # if geocode:
    #     df = df[df['geocode'].isin(geocode)]

    #     if df.empty:
    #         return 404, {
    #             "message": (
    #                 f"Data not found for specific geocode(s) ({geocode})"
    #             )
    #         }

    objs = [
        EpiScannerSchema(**d)
        for d in df.to_dict(orient="records")  # pyright: ignore
    ]

    return 200, objs
