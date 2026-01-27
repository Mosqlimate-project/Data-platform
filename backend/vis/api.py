from typing import List, Optional

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
    response=List[schema.SectionOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_categories(request):
    data = (
        RepositoryModel.objects.annotate(predictions_count=Count("predicts"))
        .filter(predictions_count__gt=0)
        .values_list("sprint_id", "category", "adm_level")
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

    category_labels = dict(RepositoryModel.Category.choices)

    sections_structure = {"default": {}, "sprint": {}}

    for sprint_id, category_slug, adm_level in data:
        if adm_level not in adm_levels:
            continue

        section_key = "sprint" if sprint_id is not None else "default"

        if category_slug not in sections_structure[section_key]:
            sections_structure[section_key][category_slug] = set()

        sections_structure[section_key][category_slug].add(
            adm_levels[adm_level]
        )

    results = []
    level_order = ["national", "state", "municipal", "sub_municipal"]

    section_definitions = [
        ("default", "General"),
        ("sprint", "IMDC"),
    ]

    for section_key, section_label in section_definitions:
        categories_data = sections_structure.get(section_key, {})
        if not categories_data:
            continue

        formatted_categories = []

        for cat_slug, levels_set in categories_data.items():
            if not levels_set:
                continue

            formatted_levels = [
                {"id": slug, "label": label, "url_slug": slug}
                for slug, label in levels_set
            ]
            formatted_levels.sort(
                key=lambda x: (
                    level_order.index(x["id"])
                    if x["id"] in level_order
                    else 99
                )
            )

            formatted_categories.append(
                {
                    "id": cat_slug,
                    "label": str(category_labels.get(cat_slug, cat_slug)),
                    "levels": formatted_levels,
                }
            )

        formatted_categories.sort(key=lambda x: x["label"])

        results.append(
            {
                "id": section_key,
                "label": section_label,
                "categories": formatted_categories,
            }
        )

    return results


@router.get(
    "/dashboard/diseases/",
    response=List[schema.DashboardDiseasesOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_diseases(
    request, category: str, adm_level: int, sprint: bool = False
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

    categories = category_map.get(category, [category])

    diseases = Disease.objects.filter(
        models__adm_level=adm_level,
        models__category__in=categories,
        models__predicts__isnull=False,
    )

    if sprint:
        diseases = diseases.filter(models__sprint__isnull=False)
    else:
        diseases = diseases.filter(models__sprint__isnull=True)

    return diseases.distinct()


@router.get(
    "/dashboard/countries/",
    response=List[schema.DashboardADMOut],
    auth=uidkey_auth,
    include_in_schema=False,
)
def dashboard_countries(
    request,
    category: str,
    adm_level: int,
    disease: str = "A90",
    sprint: bool = False,
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

    categories = category_map.get(category, [category])

    if adm_level is None:
        return []

    repo_qs = RepositoryModel.objects.filter(
        disease__code=disease,
        adm_level=adm_level,
        category__in=categories,
        predicts__isnull=False,
    )

    if sprint:
        repo_qs = repo_qs.filter(sprint__isnull=False)
    else:
        repo_qs = repo_qs.filter(sprint__isnull=True)

    prediction_geocodes = repo_qs.values_list(
        f"predicts__adm{adm_level}__geocode", flat=True
    ).distinct()

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
    category: str,
    adm_level: int,
    disease: str = "A90",
    country: str = "BRA",
    sprint: bool = False,
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

    categories = category_map.get(category, [category])

    if adm_level is None:
        return []

    repo_qs = RepositoryModel.objects.filter(
        disease__code=disease,
        adm_level=adm_level,
        category__in=categories,
        predicts__isnull=False,
    )

    if sprint:
        repo_qs = repo_qs.filter(sprint__isnull=False)
    else:
        repo_qs = repo_qs.filter(sprint__isnull=True)

    prediction_geocodes = repo_qs.values_list(
        f"predicts__adm{adm_level}__geocode", flat=True
    ).distinct()

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
    category: str,
    adm_level: int,
    disease: str,
    country: str,
    state: str,
    sprint: bool = False,
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

    categories = category_map.get(category, [category])

    if adm_level < 2:
        return []

    repo_qs = RepositoryModel.objects.filter(
        disease__code=disease,
        adm_level=adm_level,
        category__in=categories,
        predicts__isnull=False,
    )

    if sprint:
        repo_qs = repo_qs.filter(sprint__isnull=False)
    else:
        repo_qs = repo_qs.filter(sprint__isnull=True)

    prediction_geocodes = repo_qs.values_list(
        f"predicts__adm{adm_level}__geocode", flat=True
    ).distinct()

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
    category: str,
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

    categories = category_map.get(category, [category])

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
    category: str,
    adm_level: int,
    disease: str,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    sprint: bool = False,
):
    qs = QuantitativePrediction.objects.filter(
        model__disease__code=disease,
        model__adm_level=adm_level,
    )

    if sprint:
        qs = qs.filter(model__sprint__isnull=False)
    else:
        qs = qs.filter(model__sprint__isnull=True)

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
