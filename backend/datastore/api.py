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
from django.utils.translation import gettext as _

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
from datastore import schema, filters, models


router = Router(tags=["datastore"])

paginator = PagesPagination
paginator.max_per_page = 300
uidkey_auth = UidKeyAuth()


@router.get(
    "/endpoints/",
    response=List[schema.EndpointDetails],
    include_in_schema=False,
)
def get_endpoints(request):
    def var(var: str, typ: str, desc: str) -> schema.EndpointDataVar:
        return schema.EndpointDataVar(variable=var, type=typ, description=desc)

    def opt(option: str, typ: str) -> schema.EndpointChartOption:
        return schema.EndpointChartOption(option=option, type=typ)

    infodengue = {
        "endpoint": "/infodengue/",
        "name": _("Mosquito-borne Diseases"),
        "description": _(
            "This endpoint gives access to data from the Infodengue project, "
            "which provide a number of epidemiological variables for all the "
            "Brazilian municipalities on a weekly time scale. The request "
            "parameters and data variables are described below."
        ),
        "more_info_link": (
            "https://api.mosqlimate.org/docs/datastore/GET/infodengue/"
        ),
        "tags": [_("dengue"), _("municipal"), _("weekly")],
        "data_variables": [
            var("data_iniSE", "str", _("Start date of epidemiological week")),
            var("SE", "int", _("Epidemiological week")),
            var(
                "casos_est",
                "float",
                _(
                    "Estimated number of cases per week using the nowcasting model"
                ),
            ),
            var(
                "casos_est_min",
                "int",
                _("95% credibility interval of the estimated number of cases"),
            ),
            var(
                "casos",
                "int",
                _(
                    "Number of notified cases per week (values are retrospectively"
                    "updated every week)"
                ),
            ),
            var("municipio_geocodigo", "int", _("IBGE's municipality code")),
            var("p_rt1", "float", _("Probability (Rt > 1)")),
            var(
                "p_inc100k",
                "float",
                _("Estimated incidence rate (cases per pop x 100.00)"),
            ),
            var("Localidade_id", "int", "Sub-municipality division"),
            var(
                "nivel",
                "int",
                _("Alert level (1 = green, 2 = yellow, 3 = orange, 4 = red)"),
            ),
            var("id", "int", _("Numeric index")),
            var("versao_modelo", "str", _("Model version")),
            var(
                "Rt",
                "float",
                _("Point estimate of the reproductive number of cases"),
            ),
            var("municipio_nome", "str", _("Municipality's name")),
            var("pop", "float", _("Population (IBGE)")),
            var(
                "receptivo",
                "int",
                _(
                    "Indicates climate receptivity, i.e., conditions for high "
                    "vectorial capacity. 0 = unfavorable, 1 = favorable, 2 = "
                    "favorable this week and last week, 3 = favorable for at "
                    "least three weeks"
                ),
            ),
            var(
                "transmissao",
                "int",
                _(
                    "Evidence of sustained transmission: 0 = no evidence, 1 = "
                    "possible, 2 = likely, 3 = highly likely"
                ),
            ),
            var(
                "nivel_inc",
                "int",
                _(
                    "Estimated incidence below pre-epidemic threshold, "
                    "1 = above pre-epidemic threshold but below epidemic threshold"
                    ", 2 = above epidemic threshold"
                ),
            ),
            var(
                "umidmax",
                "float",
                _("Average daily maximum humidity percentages along the week"),
            ),
            var(
                "umidmed",
                "float",
                _("Average daily humidity percentages along the week"),
            ),
            var(
                "umidmin",
                "float",
                _("Average daily minimum humidity percentages along the week"),
            ),
            var(
                "tempmax",
                "float",
                _("Average daily maximum temperatures along the week"),
            ),
            var(
                "tempmed",
                "float",
                _("Average daily temperatures along the week"),
            ),
            var(
                "tempmin",
                "float",
                _("Average daily minimum temperatures along the week"),
            ),
            var(
                "casprov",
                "int",
                _(
                    "Probable number of cases per week (cases - discarded cases)"
                ),
            ),
            var(
                "casprov_est",
                "float",
                _("Probable number of estimated cases per week"),
            ),
            var(
                "casprov_est_min",
                "int",
                _("Credibility interval of the probable number of cases"),
            ),
            var(
                "casprov_est_max",
                "int",
                _("Credibility interval of the probable number of cases"),
            ),
            var(
                "casconf",
                "int",
                _("Cases effectively confirmed with laboratory testing"),
            ),
        ],
        "chart_options": [
            opt("disease", "str"),
            opt("geocode", "int"),
            opt("start", "date"),
            opt("end", "date"),
        ],
    }

    climate = {
        "endpoint": "/climate/",
        "name": _("Climate data"),
        "description": _(
            "Through this API endpoint, you can fetch several climate "
            "variables that have been extracted for all brazilian "
            "municipalities from the satellite-based reanalysis data provided "
            "by Copernicus ERA5."
        ),
        "more_info_link": (
            "https://api.mosqlimate.org/docs/datastore/GET/climate/"
        ),
        "tags": [_("temperature"), _("municipal"), _("daily")],
        "data_variables": [
            var("date", "date (YYYY-mm-dd)", _("Day of the year")),
            var("geocodigo", "int", _("IBGE's municipality code")),
            var("temp_min", "float (°C)", _("Minimum daily temperature")),
            var("temp_med", "float (°C)", _("Average daily temperature")),
            var("temp_max", "float (°C)", _("Maximum daily temperature")),
            var("precip_min", "float (mm)", _("Minimum daily precipitation")),
            var("precip_med", "float (mm)", _("Average daily precipitation")),
            var("precip_max", "float (mm)", _("Maximum daily precipitation")),
            var("precip_tot", "float (mm)", _("Total daily precipitation")),
            var(
                "pressao_min",
                "float (atm)",
                _("Minimum daily sea level pressure"),
            ),
            var(
                "pressao_med",
                "float (atm)",
                _("Average daily sea level pressure"),
            ),
            var(
                "pressao_max",
                "float (atm)",
                _("Maximum daily sea level pressure"),
            ),
            var("umid_min", "float (%)", _("Minimum daily relative humidity")),
            var("umid_med", "float (%)", _("Average daily relative humidity")),
            var("umid_max", "float (%)", _("Maximum daily relative humidity")),
        ],
        "chart_options": [
            opt("geocode", "int"),
            opt("start", "date"),
            opt("end", "date"),
        ],
    }

    mosquito = {
        "endpoint": "/mosquito/",
        "name": _("Mosquito Egg Count"),
        "description": _(
            "Here you get access to mosquito abundance data from the Contaovos"
            " project, co-developed by the Mosqlimate project. These data, "
            "described below, are based on eggtraps distributed throughout "
            "Brasil according to a monitoring design specified by the Ministry"
            " of Health."
        ),
        "more_info_link": (
            "https://api.mosqlimate.org/docs/datastore/GET/mosquito/"
        ),
        "tags": [_("ContaOvos"), _("municipal"), _("daily")],
        "data_variables": [
            var("counting_id", "int", ""),
            var("date", "str", ""),
            var("date_collect", "str", ""),
            var("eggs", "int", _("Eggs count")),
            var("latitude", "float", _("Ovitrap latitude")),
            var("longitude", "float", _("Ovitrap longitude")),
            var("municipality", "str", _("Municipality name")),
            var("municipality_code", "str", _("Geocode. Example: 3304557")),
            var("ovitrap_id", "str", "Ovitrap ID"),
            var("ovitrap_website_id", "int", ""),
            var("state_code", "str", _("Geocode. Example: 33")),
            var("state_name", "str", ""),
            var("time", "str (date)", _("RFC 1123 date format")),
            var("week", "int", _("Epidemiological week")),
            var("year", "int", _("Year")),
        ],
        "chart_options": [
            opt("geocode", "int"),
            opt("start", "date"),
            opt("end", "date"),
        ],
    }

    endpoints = [infodengue, climate, mosquito]

    return [schema.EndpointDetails(**e) for e in endpoints]


@router.get(
    "/infodengue/",
    response={
        200: List[schema.HistoricoAlertaSchema],
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
        uf = uf.upper()
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
    return data


@router.get(
    "/climate/",
    response={
        200: List[schema.CopernicusBrasilSchema],
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
    tags=["datastore", "infodengue"],
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
    tags=["datastore", "contaovos"],
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
    response={
        200: List[schema.EpiScannerSchema],
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
    # fmt: on
    year: int = datetime.datetime.now().year,
    # geocode: Optional[List[int]] = None
):
    APILog.from_request(request)
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
        return 200, []

    # if geocode:
    #     df = df[df['geocode'].isin(geocode)]

    #     if df.empty:
    #         return 404, {
    #             "message": (
    #                 f"Data not found for specific geocode(s) ({geocode})"
    #             )
    #         }

    objs = [
        schema.EpiScannerSchema(**d)
        for d in df.to_dict(orient="records")  # pyright: ignore
    ]

    return 200, objs


@router.get(
    "/charts/municipality/temperature/",
    response=List[schema.MunTempOut],
    auth=UidKeyAuth(),
    tags=["datastore", "charts"],
    include_in_schema=False,
)
def municipality_daily_temperature(
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
    "/charts/municipality/accumulated-waterfall/",
    response=List[schema.MunAccWaterfallOut],
    auth=UidKeyAuth(),
    tags=["datastore", "charts"],
    include_in_schema=False,
)
def municipality_daily_accumulated_waterfall(
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
    "/charts/municipality/umid-pressao-med/",
    response=List[schema.MunUmidPressMedOut],
    auth=UidKeyAuth(),
    tags=["datastore", "charts"],
    include_in_schema=False,
)
def municipality_daily_umid_press_med(
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
    "/diseases/",
    response=List[schema.DiseaseOut],
    auth=uidkey_auth,
    tags=["datastore"],
    include_in_schema=False,
)
def disease_search(
    request,
    icd: Literal["ICD-10", "ICD-11"],
    version: str,
    filters: filters.DiseaseFilterSchema = Query(...),
):
    qs = models.Disease.objects.filter(icd__system=icd, icd__version=version)
    return filters.filter(qs)


@router.get(
    "/cities/",
    response=List[schema.CityOut],
    auth=uidkey_auth,
    tags=["datastore"],
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
