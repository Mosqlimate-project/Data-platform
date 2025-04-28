import datetime
import requests
from typing import List, Literal, Optional

import duckdb
import pandas as pd
from epiweeks import Week

from ninja import Router, Query
from ninja.errors import HttpError
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError
from django.db.models import F, Avg, Sum
from django.db.models.functions import Round
from django.conf import settings

from users.auth import UidKeyAuth
from main.schema import NotFoundSchema, InternalErrorSchema, BadRequestSchema
from main.utils import UFs
from main.models import APILog
from registry.pagination import PagesPagination
from vis.brasil.models import State, GeoMacroSaude
from .models import (
    Municipio,
    HistoricoAlerta,
    HistoricoAlertaZika,
    HistoricoAlertaChik,
    CopernicusBrasil,
)
from .schema import (
    HistoricoAlertaSchema,
    HistoricoAlertaFilterSchema,
    CopernicusBrasilSchema,
    CopernicusBrasilWeeklySchema,
    CopernicusBrasilFilterSchema,
    CopernicusBrasilWeeklyFilterSchema,
    CopernicusBrasilWeeklyParams,
    ContaOvosSchema,
    EpiScannerSchema,
    ContaOvosParams,
)


router = Router()

paginator = PagesPagination
paginator.max_per_page = 300
uidkey_auth = UidKeyAuth()


@router.get(
    "/infodengue/",
    response={
        200: List[HistoricoAlertaSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_infodengue(
    request,
    disease: Literal["dengue", "zika", "chik", "chikungunya"],
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
    APILog.from_request(request)
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
                "message": "Unknown disease. Options: dengue, zika, chikungunya"
            }
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()  # pyright: ignore
        if uf not in list(UFs):
            return 404, {"message": "Unkown UF. Format: SP"}
        uf_name = UFs[uf]
        geocodes = (
            Municipio.objects.using("infodengue")
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
    auth=uidkey_auth,
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
    APILog.from_request(request)
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
            Municipio.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(geocodigo__in=geocodes)

    data = filters.filter(data)
    return data


@router.get(
    "/climate/weekly/",
    response={
        200: List[CopernicusBrasilWeeklySchema],
        400: BadRequestSchema,
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
    tags=["datastore", "infodengue"],
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil_weekly(
    request,
    params: CopernicusBrasilWeeklyParams = Query(...),
    filters: CopernicusBrasilWeeklyFilterSchema = Query(...),
    **kwargs,
):
    APILog.from_request(request)
    if not params.geocode and not params.macro_health_code and not params.uf:
        # NOTE: raising a HttpError is a workaround (django-ninja/issues/940)
        raise HttpError(
            400,
            "the request must contain `geocode` or `macro_health_code` or `uf`",
        )

    if (
        sum(map(bool, [params.geocode, params.uf, params.macro_health_code]))
        != 1
    ):
        raise HttpError(
            400,
            "the request must contain `geocode` or `macro_health_code` or `uf`",
        )

    if params.uf:
        try:
            state = State.objects.get(uf=params.uf.upper())
        except State.DoesNotExist:
            raise HttpError(400, f"Unknown UF: `{params.uf}`")
        geocodes = list(
            Municipio.objects.using("infodengue")
            .filter(uf=state.name)
            .values_list("geocodigo", flat=True)
        )
    elif params.macro_health_code:
        try:
            geocodes = list(
                GeoMacroSaude.objects.get(geocode=params.macro_health_code)
                .cities.all()
                .values_list("geocode", flat=True)
            )
        except GeoMacroSaude.DoesNotExist:
            raise HttpError(
                400,
                f"Unknown Macro Health Geocode: `{params.macro_health_code}`",
            )
    else:
        try:
            geocodes = [
                Municipio.objects.using("infodengue")
                .get(geocodigo=params.geocode)
                .geocodigo
            ]
        except Municipio.DoesNotExist:
            raise HttpError(400, f"Unknown geocode: `{params.geocode}`")

    try:
        sweek = Week.fromstring(str(filters.start))
        eweek = Week.fromstring(str(filters.end))

        if sweek.startdate() > eweek.startdate():
            sweek, eweek = eweek, sweek

    except ValueError as err:
        raise HttpError(400, f"`start` or `end` epiweek error: {err}")

    try:
        data = (
            CopernicusBrasil.objects.using("infodengue")
            .filter(
                date__gte=sweek.startdate(),
                date__lte=eweek.enddate(),
                geocodigo__in=geocodes,
            )
            .values("epiweek", "geocodigo")
            .annotate(
                temp_min_avg=Round(Avg("temp_min"), 4),
                temp_med_avg=Round(Avg("temp_med"), 4),
                temp_max_avg=Round(Avg("temp_max"), 4),
                temp_amplit_avg=Round(Avg(F("temp_max") - F("temp_min")), 4),
                precip_tot_sum=Round(Sum("precip_tot"), 4),
                umid_min_avg=Round(Avg("umid_min"), 4),
                umid_med_avg=Round(Avg("umid_med"), 4),
                umid_max_avg=Round(Avg("umid_max"), 4),
            )
        )
    except OperationalError:
        raise HttpError(500, "Server error. Please contact the moderation")

    return data


@router.get(
    "/mosquito/",
    response={
        200: List[ContaOvosSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
    tags=["datastore", "contaovos"],
)
@csrf_exempt
def get_contaovos(
    request,
    params: ContaOvosParams = Query(...),
    municipality: Optional[str] = None,
):
    APILog.from_request(request)
    url = "https://contaovos.com/pt-br/api/lastcountingpublic"
    params = {
        "date_start": params.date_start,
        "date_end": params.date_end,
        "page": params.page,
        "state": params.state,
        "municipality": municipality,
    }
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
    auth=uidkey_auth,
    tags=["datastore", "episcanner"],
)
@csrf_exempt
def get_episcanner(
    request,
    # fmt: off
    disease: Literal["dengue", "zika", "chikungunya"],
    uf: Literal[
        "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP",
        "SE", "TO", "DF"
    ],
    # fmt: on
    year: int = datetime.datetime.now().year,
    # geocode: Optional[List[int]] = None
):
    APILog.from_request(request)
    db = duckdb.connect(
        str(
            settings.DJANGO_CONTAINER_DATA_PATH
            / "episcanner"
            / "episcanner.duckdb"
        ),
        read_only=True,
    )

    describe: pd.DataFrame = db.execute("DESCRIBE").fetchdf()

    if describe.empty:
        print("Duckdb data not found while trying to retrieve EpiScanner data")
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }

    if disease == "chikungunya":
        disease = "chik"

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
