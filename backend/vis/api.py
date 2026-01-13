from typing import Literal, List, Optional

from users.auth import UidKeyAuth
from datastore.models import (
    Adm0,
    Adm1,
    Adm2,
)
from registry.models import (
    Disease,
    RepositoryModel,
    Sprint,
    QuantitativePrediction,
    QuantitativePredictionRow,
)
from vis.utils import hist_alerta_data
from vis import schema

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache
from django.db.models import Count, Max, Min


router = Router()
uidkey_auth = UidKeyAuth()


@router.get(
    "/dashboard/categories/",
    response=List[schema.CategoryOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_categories(request):
    categories = (
        RepositoryModel.objects.annotate(predictions_count=Count("predicts"))
        .filter(predictions_count__gt=0)
        .values_list("category", "adm_level")
        .distinct()
    )

    adm_levels = {
        RepositoryModel.AdministrativeLevel.NATIONAL: ("national", "National"),
        RepositoryModel.AdministrativeLevel.STATE: ("state", "State"),
        RepositoryModel.AdministrativeLevel.MUNICIPALITY: (
            "municipal",
            "Municipal",
        ),
        RepositoryModel.AdministrativeLevel.SUB_MUNICIPALITY: (
            "sub_municipal",
            "Sub-Municipal",
        ),
    }

    groups_map = {
        "quantitative": {
            "id": "quantitative",
            "label": "Quantitative Predictions",
            "levels": set(),
        },
        "categorical": {
            "id": "categorical",
            "label": "Categorical Predictions",
            "levels": set(),
        },
    }

    for category, adm in categories:
        target_group = None

        if "quantitative" in category:
            target_group = groups_map["quantitative"]
        elif "categorical" in category:
            target_group = groups_map["categorical"]

        if target_group and adm in adm_levels:
            target_group["levels"].add(adm_levels[adm])

    results = []
    level_order = ["national", "state", "municipal", "sub_municipal"]

    for key, data in groups_map.items():
        if not data["levels"]:
            continue

        formatted_levels = [
            {"id": slug, "label": label, "url_slug": slug}
            for slug, label in data["levels"]
        ]

        formatted_levels.sort(
            key=lambda x: (
                level_order.index(x["id"]) if x["id"] in level_order else 99
            )
        )

        results.append(
            {
                "id": data["id"],
                "label": data["label"],
                "levels": formatted_levels,
            }
        )

    results.sort(key=lambda x: x["label"])

    return results


@router.get(
    "/dashboard/diseases/",
    response=List[schema.DashboardDiseasesOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_diseases(
    request, category: Literal["quantitative", "categorical"], adm_level: int
):
    category_map = {
        "quantitative": [
            RepositoryModel.Category.QUANTITATIVE,
            RepositoryModel.Category.SPATIAL_QUANTITATIVE,
            RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
        ],
        "categorical": [
            RepositoryModel.Category.CATEGORICAL,
            RepositoryModel.Category.SPATIAL_CATEGORICAL,
            RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
        ],
    }

    categories = category_map.get(category)
    if not categories and category == "categorical":
        categories = category_map["categorical"]

    diseases = Disease.objects.filter(
        models__adm_level=adm_level,
        models__category__in=categories,
        models__predicts__isnull=False,
    ).distinct()

    return diseases


@router.get(
    "/dashboard/countries/",
    response=List[schema.DashboardADMOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_countries(
    request,
    category: Literal["quantitative", "categorical"],
    adm_level: int,
    disease: str = "A90",
):
    category_map = {
        "quantitative": [
            RepositoryModel.Category.QUANTITATIVE,
            RepositoryModel.Category.SPATIAL_QUANTITATIVE,
            RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
        ],
        "categorical": [
            RepositoryModel.Category.CATEGORICAL,
            RepositoryModel.Category.SPATIAL_CATEGORICAL,
            RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
        ],
    }

    categories = category_map.get(category)

    if not categories and category == "categorical":
        categories = category_map["categorical"]

    if adm_level is None:
        return []

    prediction_geocodes = (
        RepositoryModel.objects.filter(
            disease__code=disease,
            adm_level=adm_level,
            category__in=categories,
            predicts__isnull=False,
        )
        .values_list(f"predicts__adm{adm_level}__geocode", flat=True)
        .distinct()
    )

    if adm_level == 0:
        countries = Adm0.objects.filter(geocode__in=prediction_geocodes)
    elif adm_level == 1:
        countries = Adm0.objects.filter(
            states__geocode__in=prediction_geocodes
        )
    elif adm_level == 2:
        countries = Adm0.objects.filter(
            states__cities__geocode__in=prediction_geocodes
        )
    elif adm_level == 3:
        countries = Adm0.objects.none()
    else:
        countries = Adm0.objects.none()

    return countries.distinct()


@router.get(
    "/dashboard/states/",
    response=List[schema.DashboardADMOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_states(
    request,
    category: Literal["quantitative", "categorical"],
    adm_level: int,
    disease: str = "A90",
    country: str = "BRA",
):
    category_map = {
        "quantitative": [
            RepositoryModel.Category.QUANTITATIVE,
            RepositoryModel.Category.SPATIAL_QUANTITATIVE,
            RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
        ],
        "categorical": [
            RepositoryModel.Category.CATEGORICAL,
            RepositoryModel.Category.SPATIAL_CATEGORICAL,
            RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
        ],
    }

    categories = category_map.get(category)

    if not categories and category == "categorical":
        categories = category_map["categorical"]

    if adm_level is None:
        return []

    prediction_geocodes = (
        RepositoryModel.objects.filter(
            disease__code=disease,
            adm_level=adm_level,
            category__in=categories,
            predicts__isnull=False,
        )
        .values_list(f"predicts__adm{adm_level}__geocode", flat=True)
        .distinct()
    )

    if adm_level == 1:
        states = Adm1.objects.filter(
            geocode__in=prediction_geocodes, country__geocode=country
        )
    elif adm_level == 2:
        states = Adm1.objects.filter(
            cities__geocode__in=prediction_geocodes, country__geocode=country
        )
    elif adm_level == 3:
        states = Adm1.objects.none()
    else:
        states = Adm1.objects.none()

    return states.distinct()


@router.get(
    "/dashboard/cities/",
    response=List[schema.DashboardADMOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_cities(
    request,
    category: Literal["quantitative", "categorical"],
    adm_level: int,
    disease: str,
    country: str,
    state: str,
):
    category_map = {
        "quantitative": [
            RepositoryModel.Category.QUANTITATIVE,
            RepositoryModel.Category.SPATIAL_QUANTITATIVE,
            RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
        ],
        "categorical": [
            RepositoryModel.Category.CATEGORICAL,
            RepositoryModel.Category.SPATIAL_CATEGORICAL,
            RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
        ],
    }

    categories = category_map.get(category)
    if not categories and category == "categorical":
        categories = category_map["categorical"]

    if adm_level < 2:
        return []

    prediction_geocodes = (
        RepositoryModel.objects.filter(
            disease__code=disease,
            adm_level=adm_level,
            category__in=categories,
            predicts__isnull=False,
        )
        .values_list(f"predicts__adm{adm_level}__geocode", flat=True)
        .distinct()
    )

    if adm_level == 2:
        cities = Adm2.objects.filter(
            geocode__in=prediction_geocodes,
            adm1__geocode=state,
            adm1__country__geocode=country,
        )
    elif adm_level == 3:
        cities = Adm2.objects.none()
    else:
        cities = Adm2.objects.none()

    return cities.distinct()


@router.get(
    "/dashboard/sprints/",
    response=List[schema.DashboardSprintOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_sprints(
    request,
    category: Literal["quantitative", "categorical"],
    adm_level: int,
    disease: str,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
):
    category_map = {
        "quantitative": [
            RepositoryModel.Category.QUANTITATIVE,
            RepositoryModel.Category.SPATIAL_QUANTITATIVE,
            RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE,
        ],
        "categorical": [
            RepositoryModel.Category.CATEGORICAL,
            RepositoryModel.Category.SPATIAL_CATEGORICAL,
            RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL,
        ],
    }

    categories = category_map.get(category)
    if not categories and category == "categorical":
        categories = category_map["categorical"]

    qs = Sprint.objects.filter(
        repositorymodel__disease__code=disease,
        repositorymodel__adm_level=adm_level,
        repositorymodel__category__in=categories,
    )

    if adm_level == 0 and country:
        qs = qs.filter(repositorymodel__predicts__adm0__geocode=country)
    elif adm_level == 1 and state:
        qs = qs.filter(repositorymodel__predicts__adm1__geocode=state)
    elif adm_level == 2 and city:
        qs = qs.filter(repositorymodel__predicts__adm2__geocode=city)

    return qs.distinct()


@router.get(
    "/dashboard/predictions/",
    response=List[schema.DashboardPredictionOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_predictions(
    request,
    category: Literal["quantitative", "categorical"],
    adm_level: int,
    disease: str,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
):
    # TODO: needs more categories when other categories are included
    qs = QuantitativePrediction.objects.filter(
        model__disease__code=disease,
        model__adm_level=adm_level,
    )

    if adm_level == 0 and country:
        qs = qs.filter(adm0__geocode=country)
    elif adm_level == 1 and state:
        qs = qs.filter(adm1__geocode=state)
    elif adm_level == 2 and city:
        qs = qs.filter(adm2__geocode=city)

    qs = qs.select_related(
        "model",
        "model__repository",
        "model__sprint",
        "model__repository__organization",
        "model__repository__owner",
    )

    qs = qs.annotate(start=Min("data__date"), end=Max("data__date"))

    qs = qs.filter(start__isnull=False)

    return qs


@router.get(
    "/dashboard/prediction/{prediction_id}/",
    response=List[schema.DashboardQuantitativePredictionOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_prediction(request, prediction_id: int):
    return QuantitativePredictionRow.objects.filter(
        prediction_id=prediction_id
    ).order_by("date")


@router.get(
    "/dashboard/cases/",
    response=List[schema.HistoricoAlertaCases],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_cases(
    request, payload: schema.HistoricoAlertaCasesIn = Query(...)
):
    match payload.disease:
        case "A90":
            disease = "dengue"
        case "A92.5":
            disease = "zika"
        case "A92.0":
            disease = "chik"
        case _:
            disease = None

    if not disease:
        return list()

    df = hist_alerta_data(
        sprint=payload.sprint,
        disease=disease,
        start_window_date=payload.start,
        end_window_date=payload.end,
        adm_level=payload.adm_level,
        adm_1=payload.adm_1,
        adm_2=payload.adm_2,
    )

    if df.empty:
        return list()

    df = df.sort_values(by="date")

    res = []
    for _, row in df.iterrows():
        res.append(
            schema.HistoricoAlertaCases(date=row["date"], cases=row["target"])
        )
    return res
