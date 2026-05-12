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
from django.db.models import F, Avg, Sum, Count, Q
from django.db.models.functions import Round
from django.conf import settings
from django.core.cache import cache


from users.auth import UidKeyAuth
from main.schema import NotFoundSchema, InternalErrorSchema, BadRequestSchema
from main.utils import UFs, UF_CODES, CODES_UF
from main.models import APILog
from registry.pagination import PagesPagination
from vis.brasil.models import State, GeoMacroSaude
from .models import (
    Municipio,
    HistoricoAlerta,
    HistoricoAlertaZika,
    HistoricoAlertaChik,
    CopernicusBrasil,
    ContaOvos,
)
from datastore import schema, filters, models


router = Router(tags=["datastore"])

paginator = PagesPagination
uidkey_auth = UidKeyAuth()


def get_infodengue_queryset(
    disease: Literal["dengue", "chikungunya", "zika"], uf: str = None
):
    disease = disease.lower()

    if disease in ["chik", "chikungunya"]:
        qs = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        qs = HistoricoAlerta.objects.using("infodengue").all()
    elif disease == "zika":
        qs = HistoricoAlertaZika.objects.using("infodengue").all()
    else:
        return None

    if uf:
        uf = uf.upper()
        if uf in UFs:
            uf_name = UFs[uf]
            geocodes = (
                Municipio.objects.using("infodengue")
                .filter(uf=uf_name)
                .values_list("geocodigo", flat=True)
            )
            qs = qs.filter(municipio_geocodigo__in=geocodes)
        else:
            raise ValueError("Invalid UF")

    return qs


@router.get(
    "/infodengue/",
    response={
        200: List[schema.HistoricoAlertaSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
)
@paginate(paginator)
@csrf_exempt
def get_infodengue(
    request,
    disease: Literal["dengue", "zika", "chik", "chikungunya"],
    filters: filters.HistoricoAlertaFilterSchema = Query(...),
    # fmt: off
    uf: Optional[
        Literal[
            "AC",
            "AL",
            "AP",
            "AM",
            "BA",
            "CE",
            "ES",
            "GO",
            "MA",
            "MT",
            "MS",
            "MG",
            "PA",
            "PB",
            "PR",
            "PE",
            "PI",
            "RJ",
            "RN",
            "RS",
            "RO",
            "RR",
            "SC",
            "SP",
            "SE",
            "TO",
            "DF",
        ]
    ] = None,
    # fmt: on
    **kwargs,
):
    APILog.from_request(request)
    disease = disease.lower()

    try:
        data = get_infodengue_queryset(disease, uf)
    except ValueError:
        return 404, {"message": f"Unknown UF '{uf}'"}
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if data is None:
        return 404, {"message": f"Unknown disease '{disease}'"}

    data = filters.filter(data)

    return data


@router.get(
    "/climate/",
    response={
        200: List[schema.CopernicusBrasilSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil(
    request,
    filters: filters.CopernicusBrasilFilterSchema = Query(...),
    # fmt: off
    uf: Optional[
        Literal[
            "AC",
            "AL",
            "AP",
            "AM",
            "BA",
            "CE",
            "ES",
            "GO",
            "MA",
            "MT",
            "MS",
            "MG",
            "PA",
            "PB",
            "PR",
            "PE",
            "PI",
            "RJ",
            "RN",
            "RS",
            "RO",
            "RR",
            "SC",
            "SP",
            "SE",
            "TO",
            "DF",
        ]
    ] = None,
    # fmt: on
    **kwargs,
):
    APILog.from_request(request)
    try:
        data = CopernicusBrasil.objects.using("infodengue").all()
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf = uf.upper()
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
        200: List[schema.CopernicusBrasilWeeklySchema],
        400: BadRequestSchema,
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
)
@paginate(paginator)
@csrf_exempt
def get_copernicus_brasil_weekly(
    request,
    params: schema.CopernicusBrasilWeeklyParams = Query(...),
    filters: filters.CopernicusBrasilWeeklyFilterSchema = Query(...),
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
        200: List[schema.ContaOvosSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
)
@csrf_exempt
def get_contaovos(
    request,
    params: schema.ContaOvosParams = Query(...),
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
        return 200, [schema.ContaOvosSchema(**i) for i in response.json()]

    if response.status_code == 500:
        return 500, {
            "message": "Internal error. Please contact the moderation"
        }

    return 404, {"message": response.json()}


@router.get(
    "/episcanner/",
    auth=uidkey_auth,
)
@csrf_exempt
def get_episcanner(
    request,
    # fmt: off
    disease: Literal["dengue", "zika", "chikungunya"],
    uf: Literal[
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
        "DF",
    ],
    year: int = datetime.datetime.now().year,
):
    APILog.from_request(request)

    cache_key = f"episcanner:{disease}:{uf}:{year}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return 200, cached_data

    db = duckdb.connect(
        str(
            settings.BACKEND_CONTAINER_DATA_PATH
            / "episcanner"
            / "episcanner.duckdb"
        ),
        read_only=True,
    )

    describe: pd.DataFrame = db.execute("DESCRIBE").fetchdf()

    if describe.empty:
        print("Duckdb data not found while trying to retrieve EpiScanner data")
        return 500, {
            "message": "Internal error. Please contact the moderation",
        }

    if disease == "chikungunya":
        disease = "chik"

    sql = f"SELECT * FROM '{uf}' WHERE disease = '{disease}' AND year = {year}"

    try:
        df = db.execute(sql).fetchdf()
    except duckdb.CatalogException as e:
        print(f"Duckdb error executing sql {sql}\n{e}")
        return 500, {
            "message": "Internal error. Please contact the moderation",
        }
    except duckdb.IOException as e:
        print(f"Duckdb IO error: {e}")
        return 500, {
            "message": "Internal error. Please contact the moderation",
        }
    finally:
        db.close()

    if df.empty:
        return 200, []

    objs = [
        schema.EpiScannerSchema(**d)
        for d in df.to_dict(orient="records")  # pyright: ignore
    ]

    cache.set(cache_key, objs, timeout=86400)  # 24 hours

    return 200, objs


@router.get(
    "/charts/infodengue/rt/",
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_infodengue_rt(
    request,
    disease: str,
    geocode: int,
    start: datetime.date,
    end: datetime.date,
):
    qs = get_infodengue_queryset(disease)

    if qs is None:
        return 404, {"message": "Unknown disease"}

    data = (
        qs.filter(
            municipio_geocodigo=geocode,
            data_iniSE__gte=start,
            data_iniSE__lte=end,
        )
        .values("data_iniSE", "Rt")
        .order_by("data_iniSE")
    )

    return list(data)


@router.get(
    "/charts/infodengue/total-cases/",
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_infodengue_total_cases(
    request,
    disease: str,
    geocode: int,
    start: datetime.date,
    end: datetime.date,
):
    qs = get_infodengue_queryset(disease)

    if qs is None:
        return 404, {"message": "Unknown disease"}

    qs = qs.filter(
        municipio_geocodigo=geocode, data_iniSE__gte=start, data_iniSE__lte=end
    )

    total = qs.aggregate(total=Sum("casos"))["total"] or 0

    return {"total_cases": total}


@router.get(
    "/charts/climate/temperature/",
    response=List[schema.MunTempOut],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_climate_daily_temperature(
    request, geocode: int, start: datetime.date, end: datetime.date
):
    return (
        CopernicusBrasil.objects.using("infodengue")
        .filter(geocodigo=geocode, date__gte=start, date__lte=end)
        .order_by("date")
        .values(
            "date",
            "epiweek",
            "temp_min",
            "temp_med",
            "temp_max",
        )
    )


@router.get(
    "/charts/climate/accumulated-waterfall/",
    response=List[schema.MunAccWaterfallOut],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_climate_daily_accumulated_waterfall(
    request, geocode: int, start: datetime.date, end: datetime.date
):
    return (
        CopernicusBrasil.objects.using("infodengue")
        .filter(geocodigo=geocode, date__gte=start, date__lte=end)
        .order_by("date")
        .values(
            "date",
            "epiweek",
            "precip_tot",
            "precip_med",
        )
    )


@router.get(
    "/charts/climate/umid-pressao-med/",
    response=List[schema.MunUmidPressMedOut],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_climate_daily_umid_press_med(
    request, geocode: int, start: datetime.date, end: datetime.date
):
    return (
        CopernicusBrasil.objects.using("infodengue")
        .filter(geocodigo=geocode, date__gte=start, date__lte=end)
        .order_by("date")
        .values(
            "date",
            "epiweek",
            "umid_med",
            "pressao_med",
        )
    )


@router.get(
    "/charts/contaovos/eggs_density/",
    response=List[schema.EggsDensitySchema],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_contaovos(
    request,
    start: datetime.date,
    end: datetime.date,
    uf: Optional[str] = None,
    geocode: Optional[int] = None,
):
    qs = ContaOvos.objects.filter(date__range=(start, end))

    if uf:
        qs = qs.filter(adm2__adm1=UF_CODES[uf.upper()])
    elif geocode:
        qs = qs.filter(adm2=geocode)

    qs = (
        qs.values("year", "week")
        .annotate(total_eggs=Sum("eggs"))
        .order_by("year", "week")
    )

    return [
        {
            "epiweek": f"{row['year']}-{str(row['week']).zfill(2)}",
            "total_eggs": row["total_eggs"],
        }
        for row in qs
    ]


@router.get(
    "/charts/contaovos/positivity/",
    response=List[schema.PositivitySchema],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_contaovos_positivity(
    request,
    start: datetime.date,
    end: datetime.date,
    uf: Optional[str] = None,
):
    qs = ContaOvos.objects.filter(date__range=(start, end))

    if uf:
        qs = qs.filter(adm2__adm1=UF_CODES[uf.upper()])

    data = (
        qs.annotate(group=F("adm2__name") if uf else F("adm2__adm1__geocode"))
        .values("group")
        .annotate(
            total_traps=Count("ovitrap_website_id", distinct=True),
            pos_traps=Count(
                "ovitrap_website_id", distinct=True, filter=Q(eggs__gt=0)
            ),
        )
    )

    result = []
    for row in data:
        name = row["group"]
        if not uf:
            name = CODES_UF.get(int(name), str(name))
        positivity = round(
            (
                (row["pos_traps"] / row["total_traps"] * 100)
                if row["total_traps"]
                else 0
            ),
            2,
        )
        result.append({"name": name, "positivity": positivity})

    result.sort(key=lambda x: x["positivity"], reverse=True)
    return result


@router.get(
    "/charts/contaovos/map/",
    response=List[schema.MapStateSchema],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_contaovos_map(
    request,
    start: datetime.date,
    end: datetime.date,
):
    qs = ContaOvos.objects.filter(date__range=(start, end))

    states = (
        qs.annotate(state_code_num=F("adm2__adm1__geocode"))
        .values("state_code_num")
        .annotate(
            total_eggs=Sum("eggs"),
            trap_count=Count("ovitrap_website_id", distinct=True),
            municipality_count=Count("adm2", distinct=True),
        )
    )

    state_data = []
    for row in states:
        name = CODES_UF.get(
            int(row["state_code_num"]),
            str(row["state_code_num"]),
        )
        state_data.append(
            {
                "name": name,
                "total_eggs": row["total_eggs"],
                "trap_count": row["trap_count"],
                "municipality_count": row["municipality_count"],
            }
        )

    return state_data


@router.get(
    "/charts/contaovos/map/scatter/",
    response=List[schema.MapScatterSchema],
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def charts_contaovos_map_scatter(
    request,
    start: datetime.date,
    end: datetime.date,
):
    qs = ContaOvos.objects.filter(date__range=(start, end))

    scatter_qs = (
        qs.filter(
            latitude__gte=-33.8,
            latitude__lte=5.3,
            longitude__gte=-74.0,
            longitude__lte=-34.8,
        )
        .annotate(
            state_code=F("adm2__adm1__geocode"),
            trap_id=F("ovitrap_website_id"),
            municipality=F("adm2__name"),
        )
        .values(
            "state_code", "latitude", "longitude", "trap_id", "municipality"
        )
    )

    scatter_data = []
    for row in scatter_qs:
        name = CODES_UF.get(int(row["state_code"]), str(row["state_code"]))
        scatter_data.append(
            {
                "name": name,
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "trap_id": row["trap_id"],
                "municipality": row["municipality"],
            }
        )

    return scatter_data


@router.get(
    "/diseases/",
    response=List[schema.DiseaseOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def disease_search(
    request,
    icd: Literal["ICD-10", "ICD-11"],
    version: str,
    filters: filters.DiseaseFilterSchema = Query(...),
):
    available = ["A90", "A92.0", "A92.5"]
    qs = models.Disease.objects.filter(
        icd__system=icd,
        icd__version=version,
        code__in=available,
    )
    return filters.filter(qs)


@router.get(
    "/cities/",
    response=List[schema.CityOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def city_search(
    request,
    adm_0: Optional[str] = "BRA",
    filters: filters.Adm2FilterSchema = Query(...),
):
    qs = models.Adm2.objects.select_related("adm1", "adm1__country")

    if adm_0:
        qs = qs.filter(adm1__country__geocode=adm_0)

    qs = filters.filter(qs)

    return qs
