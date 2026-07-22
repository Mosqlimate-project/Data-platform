import datetime
import requests
from typing import Any, List, Literal, Optional

from epiweeks import Week

from ninja import Router, Query
from ninja.errors import HttpError
from ninja.pagination import paginate
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError
from django.db.models import F, Avg, Sum, Count, Q
from django.db.models.functions import Round
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
    Adm2,
    EpiscannerSirParams,
)
from datastore import schema, filters, models


router = Router(tags=["datastore"])

paginator = PagesPagination
uidkey_auth = UidKeyAuth()


@router.get(
    "/vegetation/",
    response={
        200: List[schema.VegetationIndexMetricSchema],
        404: NotFoundSchema,
        500: InternalErrorSchema,
    },
    auth=uidkey_auth,
)
@paginate(paginator)
@csrf_exempt
def get_vegetation_metrics(
    request,
    filters: filters.VegetationIndexMetricFilterSchema = Query(...),
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
    **kwargs,
):
    APILog.from_request(request)

    try:
        data = models.VegetationIndexMetric.objects.using("infodengue").all()
    except OperationalError:
        return 500, {"message": "Server error. Please contact the moderation"}

    if uf:
        uf_upper = uf.upper()  # type: ignore[no-redef]
        if uf_upper not in list(UFs):
            return 404, {"message": "Unknown UF. Format: SP"}

        uf_name = UFs[uf]
        geocodes = (
            Municipio.objects.using("infodengue")
            .filter(uf=uf_name)
            .values_list("geocodigo", flat=True)
        )
        data = data.filter(geocode__in=geocodes)

    data = filters.filter(data)
    return data


def get_infodengue_queryset(
    disease: Literal["dengue", "chikungunya", "zika"], uf: Optional[str] = None
):
    disease = disease.lower()  # type: ignore[assignment]

    if disease in ["chik", "chikungunya"]:
        qs: Any = HistoricoAlertaChik.objects.using("infodengue").all()
    elif disease in ["deng", "dengue"]:
        qs = HistoricoAlerta.objects.using("infodengue").all()  # type: ignore[assignment]
    elif disease == "zika":
        qs = HistoricoAlertaZika.objects.using("infodengue").all()  # type: ignore[assignment]
    else:
        return None

    if uf:
        uf = uf.upper()  # type: ignore[no-redef]
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
    disease = disease.lower()  # type: ignore[assignment]

    try:
        data = get_infodengue_queryset(disease, uf)  # type: ignore[arg-type]
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
        uf = uf.upper()  # type: ignore[assignment,no-redef]
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
    response=List[schema.EpiScannerSchema],
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

    cid10 = DISEASE_CID10[disease]

    geocodes_in_state = [
        int(g)
        for g in Adm2.objects.filter(adm1__name=UFs[uf]).values_list(
            "geocode", flat=True
        )
    ]

    rows = (
        EpiscannerSirParams.objects.using("infodengue")
        .filter(
            cid10=cid10,
            year=year,
            geocode__in=geocodes_in_state,
        )
        .values(
            "cid10",
            "geocode",
            "year",
            "ep_ini",
            "ep_pw",
            "ep_end",
            "ep_dur",
            "peak_week",
            "beta",
            "gamma",
            "r0",
            "total_cases",
            "alpha",
            "sum_res",
        )
    )

    adm2_names = {
        a.geocode: a.name
        for a in Adm2.objects.filter(
            geocode__in=[str(g) for g in geocodes_in_state]
        )
    }

    objs = [
        schema.EpiScannerSchema(
            disease=disease,
            CID10=r["cid10"],
            year=r["year"],
            geocode=r["geocode"],
            muni_name=adm2_names.get(str(r["geocode"]), ""),
            peak_week=r["peak_week"],
            beta=r["beta"],
            gamma=r["gamma"],
            R0=r["r0"],
            total_cases=r["total_cases"],
            alpha=r["alpha"],
            sum_res=r["sum_res"],
            ep_ini=r["ep_ini"],
            ep_end=r["ep_end"],
            ep_dur=r["ep_dur"],
        )
        for r in rows
    ]

    cache.set(cache_key, objs, timeout=86400)
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
    qs = get_infodengue_queryset(disease)  # type: ignore[arg-type]

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
    qs = get_infodengue_queryset(disease)  # type: ignore[arg-type]

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
        qs.values("year", "week")  # type: ignore[assignment]
        .annotate(total_eggs=Sum("eggs"))
        .order_by("year", "week")
    )

    return [
        {
            "epiweek": f"{row['year']}-{str(row['week']).zfill(2)}",  # type: ignore[index]
            "total_eggs": row["total_eggs"],  # type: ignore[index]
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


DISEASE_ALERT_MODEL = {
    "dengue": HistoricoAlerta,
    "chikungunya": HistoricoAlertaChik,
    "zika": HistoricoAlertaZika,
}

DISEASE_CID10 = {
    "dengue": "A90",
    "chikungunya": "A92.0",
    "zika": "A92.5",
}


def _get_alert_geocodes_for_uf(uf: str):
    uf = uf.upper()
    uf_name = UFs.get(uf)
    if not uf_name:
        raise HttpError(404, f"Unknown UF: {uf}")

    geocodes = Adm2.objects.filter(adm1__name=uf_name).values_list(
        "geocode", flat=True
    )
    return [int(g) for g in geocodes]


def _get_alert_queryset(disease: str, uf: Optional[str] = None):
    disease = disease.lower()
    model = DISEASE_ALERT_MODEL.get(disease)
    if not model:
        raise HttpError(400, f"Unknown disease: {disease}")

    qs = model.objects.using("infodengue").all()

    if uf:
        geocodes = _get_alert_geocodes_for_uf(uf)
        qs = qs.filter(municipio_geocodigo__in=geocodes)

    return qs


@router.get(
    "/episcanner/states/",
    response=List[schema.EpiScannerStateSchema],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_states(request):
    return [{"code": k, "name": v} for k, v in UFs.items()]


@router.get(
    "/episcanner/cities/",
    response=List[schema.EpiScannerCitySchema],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_cities(
    request,
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
    uf_name = UFs[uf]
    adm2_geocodes = Adm2.objects.filter(adm1__name=uf_name).values_list(
        "geocode", flat=True
    )
    geocodes_int = [int(g) for g in adm2_geocodes]

    start_date = Week(year - 1, 45).startdate()
    end_date = Week(year, 45).startdate()

    qs = _get_alert_queryset(disease).filter(
        municipio_geocodigo__in=geocodes_int,
        data_iniSE__gte=start_date,
        data_iniSE__lt=end_date,
    )

    municipality_geocodes = (
        qs.values_list("municipio_geocodigo", flat=True)
        .distinct()
        .order_by("municipio_geocodigo")
    )
    geocode_set = {str(g) for g in municipality_geocodes}

    adm2_names = {
        a.geocode: a.name for a in Adm2.objects.filter(geocode__in=geocode_set)
    }

    return [
        {"geocode": str(g), "name": adm2_names.get(str(g), str(g))}
        for g in sorted(geocodes_int)
        if str(g) in geocode_set
    ]


@router.get(
    "/episcanner/parameters/",
    response=List[schema.EpiScannerParameterSchema],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_parameters(
    request,
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
):
    cid10 = DISEASE_CID10[disease]

    geocodes_in_state = [
        int(g)
        for g in Adm2.objects.filter(adm1__name=UFs[uf]).values_list(
            "geocode", flat=True
        )
    ]

    qs = (
        EpiscannerSirParams.objects.using("infodengue")
        .filter(cid10=cid10, geocode__in=geocodes_in_state)
        .values(
            "cid10",
            "geocode",
            "year",
            "ep_ini",
            "ep_pw",
            "ep_end",
            "ep_dur",
            "peak_week",
            "beta",
            "gamma",
            "r0",
            "total_cases",
            "alpha",
            "sum_res",
        )
    )

    return [
        schema.EpiScannerParameterSchema(
            cid10=r["cid10"],
            geocode=r["geocode"],
            year=r["year"],
            ep_ini=r["ep_ini"],
            ep_pw=r["ep_pw"],
            ep_end=r["ep_end"],
            ep_dur=r["ep_dur"],
            peak_week=r["peak_week"],
            beta=r["beta"],
            gamma=r["gamma"],
            r0=r["r0"],
            total_cases=r["total_cases"],
            alpha=r["alpha"],
            sum_res=r["sum_res"],
        )
        for r in qs
    ]


@router.get(
    "/episcanner/timeseries/",
    response=List[schema.EpiScannerTimeseriesRow],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_timeseries(
    request,
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
    geocode: int,
    year: int = datetime.datetime.now().year,
):
    qs = _get_alert_queryset(disease).filter(municipio_geocodigo=geocode)

    if year > 0:
        start_date = Week(year - 1, 45).startdate()
        end_date = Week(year, 45).startdate()
        qs = qs.filter(
            data_iniSE__gte=start_date,
            data_iniSE__lt=end_date,
        )

    rows = qs.values("data_iniSE", "casos", "casos_est").order_by("data_iniSE")

    cumulative = 0
    result = []
    for r in rows:
        casos = r["casos"]
        if casos:
            cumulative += casos
        result.append(
            schema.EpiScannerTimeseriesRow(
                date=r["data_iniSE"],
                casos=casos,
                casos_est=r["casos_est"],
                casos_cum=cumulative,
            )
        )

    return 200, result


@router.get(
    "/episcanner/top-cities/",
    response=List[schema.EpiScannerTopCitySchema],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_top_cities(
    request,
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
    limit: int = 20,
    year: int = datetime.datetime.now().year,
):
    start_date = Week(year - 1, 45).startdate()
    end_date = Week(year, 45).startdate()
    qs = _get_alert_queryset(disease, uf)

    qs = qs.filter(
        data_iniSE__gte=start_date,
        data_iniSE__lt=end_date,
    )

    aggregated = (
        qs.values("municipio_geocodigo")
        .annotate(total_transmissao=Sum("transmissao"))
        .filter(total_transmissao__gt=0)
        .order_by("-total_transmissao")[:limit]
    )

    geocodes = [str(r["municipio_geocodigo"]) for r in aggregated]
    adm2_names = {
        a.geocode: a.name for a in Adm2.objects.filter(geocode__in=geocodes)
    }

    return [
        schema.EpiScannerTopCitySchema(
            name_muni=adm2_names.get(
                str(r["municipio_geocodigo"]), str(r["municipio_geocodigo"])
            ),
            transmissao=r["total_transmissao"],
            geocode=str(r["municipio_geocodigo"]),
        )
        for r in aggregated
    ]


@router.get(
    "/episcanner/maps/weeks/",
    response=List[schema.EpiScannerMapsWeeksItem],
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_maps_weeks(
    request,
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

    start_date = Week(year - 1, 45).startdate()
    end_date = Week(year, 45).startdate()
    qs = _get_alert_queryset(disease, uf)

    qs = qs.filter(
        data_iniSE__gte=start_date,
        data_iniSE__lt=end_date,
    )

    aggregated = qs.values("municipio_geocodigo").annotate(
        sum_transmissao=Sum("transmissao")
    )

    return [
        schema.EpiScannerMapsWeeksItem(
            geocode=str(r["municipio_geocodigo"]),
            transmissao=r["sum_transmissao"],
        )
        for r in aggregated
    ]


@router.get(
    "/episcanner/maps/r0/",
    response=schema.EpiScannerR0MapResponse,
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_maps_r0(
    request,
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
    cid10 = DISEASE_CID10[disease]

    geocodes_in_state = [
        int(g)
        for g in Adm2.objects.filter(adm1__name=UFs[uf]).values_list(
            "geocode", flat=True
        )
    ]

    params = (
        EpiscannerSirParams.objects.using("infodengue")
        .filter(
            cid10=cid10,
            year=year,
            geocode__in=geocodes_in_state,
        )
        .annotate(r0_val=F("r0"))
        .values("geocode", "r0_val")
    )

    top_r0 = sorted(params, key=lambda x: x["r0_val"], reverse=True)[:10]

    top_geocodes = [str(r["geocode"]) for r in top_r0]
    adm2_names = {
        a.geocode: a.name
        for a in Adm2.objects.filter(geocode__in=top_geocodes)
    }

    return schema.EpiScannerR0MapResponse(
        r0Data=[
            schema.EpiScannerR0MapItem(
                geocode=str(r["geocode"]),
                R0=r["r0_val"],
            )
            for r in params
        ],
        topR0=[
            schema.EpiScannerR0MapItem(
                geocode=str(r["geocode"]),
                name=adm2_names.get(str(r["geocode"]), str(r["geocode"])),
                R0=r["r0_val"],
            )
            for r in top_r0
        ],
    )


@router.get(
    "/episcanner/maps/model-eval/",
    response=schema.EpiScannerModelEvalResponse,
    auth=uidkey_auth,
    include_in_schema=False,
)
def episcanner_maps_model_eval(
    request,
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
    cid10 = DISEASE_CID10[disease]

    sir_params = {
        str(r["geocode"]): r["total_cases"]
        for r in EpiscannerSirParams.objects.using("infodengue")
        .filter(cid10=cid10, year=year)
        .values("geocode", "total_cases")
    }

    start_date = Week(year - 1, 45).startdate()
    end_date = Week(year, 45).startdate()
    qs = _get_alert_queryset(disease, uf).filter(
        data_iniSE__gte=start_date,
        data_iniSE__lt=end_date,
    )

    observed = qs.values("municipio_geocodigo").annotate(
        obs_cases=Sum("casos")
    )

    rate_map = []
    ratios = []
    for r in observed:
        geocode_str = str(r["municipio_geocodigo"])
        total = sir_params.get(geocode_str)
        obs = r["obs_cases"] or 0
        if total and total > 0:
            rate = obs / total
        else:
            rate = None
        rate_map.append(
            schema.EpiScannerModelEvalItem(
                geocode=geocode_str,
                observed_cases=obs,
                total_cases=total or 0,
                rate=round(rate, 4) if rate is not None else None,
            )
        )
        if rate is not None:
            ratios.append(rate)

    if not ratios:
        return schema.EpiScannerModelEvalResponse(rateMap=rate_map, table=[])

    bins = [0, 0.5, 0.75, 1.0, 1.25, float("inf")]
    bin_labels = ["<50%", "50-75%", "75-100%", "100-125%", ">125%"]
    bin_counts = [0] * (len(bins) - 1)

    for r in ratios:
        for i in range(len(bins) - 1):
            if bins[i] <= r < bins[i + 1]:
                bin_counts[i] += 1
                break

    total = len(ratios)
    table = [
        schema.EpiScannerModelEvalBin(
            range=label,
            count=count,
            percentage=round(count / total * 100, 1),
        )
        for label, count in zip(bin_labels, bin_counts)
    ]

    return schema.EpiScannerModelEvalResponse(rateMap=rate_map, table=table)
