from typing import List, Optional, Literal

from main.schema import NotFoundSchema
from users.auth import OptionalJWTAuth
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
    ModelPrediction,
)
from vis.utils import hist_alerta_data
from vis import schema

from ninja import Router, Query
from ninja.decorators import decorate_view
from django.views.decorators.cache import never_cache
from django.db.models import Max, Min, Q


router = Router()
auth = OptionalJWTAuth()


def can_manage_filter(user, prefix=""):
    path = f"{prefix}__" if prefix else ""

    base_filter = Q(**{f"{path}published" if prefix else "published": True})

    if user and user.is_authenticated:
        if user.is_superuser:
            return Q()

        repo_path = f"{path}model__repository"

        can_manage = (
            Q(**{f"{repo_path}__owner": user})
            | Q(
                **{
                    f"{repo_path}__organization__memberships__user": user,
                    f"{repo_path}__organization__memberships__role__in": [
                        "OWNER",
                        "ADMIN",
                    ],
                }
            )
            | Q(
                **{
                    f"{repo_path}__repository_contributors__user": user,
                    f"{repo_path}__repository_contributors__permission": "ADMIN",
                }
            )
        )
        return base_filter | can_manage

    return base_filter


@router.get(
    "/dashboard/categories/",
    response=List[schema.SectionOut],
    auth=auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_categories(request):
    perm = can_manage_filter(request.auth)

    data = (
        ModelPrediction.objects.filter(perm)
        .values_list("model__sprint_id", "model__category", "adm_level")
        .distinct()
    )

    adm_levels = {
        ModelPrediction.AdministrativeLevel.NATIONAL: ("national", "National"),
        ModelPrediction.AdministrativeLevel.STATE: ("state", "State"),
        ModelPrediction.AdministrativeLevel.MUNICIPALITY: (
            "municipal",
            "Municipal",
        ),
        ModelPrediction.AdministrativeLevel.SUB_MUNICIPALITY: (
            "sub_municipal",
            "Sub-Municipal",
        ),
    }

    category_groups = {
        RepositoryModel.Category.QUANTITATIVE: "quantitative",
        RepositoryModel.Category.SPATIAL_QUANTITATIVE: "quantitative",
        RepositoryModel.Category.SPATIO_TEMPORAL_QUANTITATIVE: "quantitative",
        RepositoryModel.Category.CATEGORICAL: "categorical",
        RepositoryModel.Category.SPATIAL_CATEGORICAL: "categorical",
        RepositoryModel.Category.SPATIO_TEMPORAL_CATEGORICAL: "categorical",
    }

    group_labels = {
        "quantitative": "Quantitative",
        "categorical": "Categorical",
    }

    sections_structure = {"default": {}, "sprint": {}}

    for sprint_id, category_slug, adm_level in data:
        if adm_level not in adm_levels:
            continue

        group_slug = category_groups.get(category_slug)
        if not group_slug:
            continue

        section_key = "sprint" if sprint_id is not None else "default"

        if group_slug not in sections_structure[section_key]:
            sections_structure[section_key][group_slug] = set()

        sections_structure[section_key][group_slug].add(adm_levels[adm_level])

    results = []
    level_order = ["national", "state", "municipal", "sub_municipal"]
    section_definitions = [("default", "General"), ("sprint", "IMDC")]

    for section_key, section_label in section_definitions:
        categories_data = sections_structure.get(section_key, {})
        if not categories_data:
            continue

        formatted_categories = []
        for group_slug, levels_set in categories_data.items():
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
                    "id": group_slug,
                    "label": group_labels.get(group_slug, group_slug),
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
    auth=auth,
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

    perm = can_manage_filter(request.auth, prefix="predictions")

    qs = Disease.objects.filter(
        perm,
        predictions__adm_level=adm_level,
        predictions__model__category__in=categories,
    )

    if sprint:
        qs = qs.filter(predictions__model__sprint__isnull=False)
    else:
        qs = qs.filter(predictions__model__sprint__isnull=True)

    return qs.distinct()


@router.get(
    "/dashboard/countries/",
    response=List[schema.DashboardADMOut],
    auth=auth,
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

    perm = can_manage_filter(request.auth)

    qs = ModelPrediction.objects.filter(
        perm,
        disease__code=disease,
        adm_level=adm_level,
        model__category__in=categories,
    )

    if sprint:
        qs = qs.filter(model__sprint__isnull=False)
    else:
        qs = qs.filter(model__sprint__isnull=True)

    prediction_geocodes = qs.values_list(
        f"adm{adm_level}__geocode", flat=True
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
    else:
        countries = Adm0.objects.none()

    return countries.distinct()


@router.get(
    "/dashboard/states/",
    response=List[schema.DashboardADMOut],
    auth=auth,
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
    perm = can_manage_filter(request.auth)

    if adm_level is None:
        return []

    qs = ModelPrediction.objects.filter(
        perm,
        disease__code=disease,
        adm_level=adm_level,
        published=True,
        model__category__in=categories,
    )

    if sprint:
        qs = qs.filter(model__sprint__isnull=False)
    else:
        qs = qs.filter(model__sprint__isnull=True)

    prediction_geocodes = qs.values_list(
        f"adm{adm_level}__geocode", flat=True
    ).distinct()

    if adm_level == 1:
        states = Adm1.objects.filter(
            geocode__in=prediction_geocodes, country__geocode=country
        )
    elif adm_level == 2:
        states = Adm1.objects.filter(
            cities__geocode__in=prediction_geocodes, country__geocode=country
        )
    else:
        states = Adm1.objects.none()

    return states.distinct()


@router.get(
    "/dashboard/cities/",
    response=List[schema.DashboardADMOut],
    auth=auth,
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
    perm = can_manage_filter(request.auth)

    if adm_level < 2:
        return []

    qs = ModelPrediction.objects.filter(
        perm,
        disease__code=disease,
        adm_level=adm_level,
        published=True,
        model__category__in=categories,
    )

    if sprint:
        qs = qs.filter(model__sprint__isnull=False)
    else:
        qs = qs.filter(model__sprint__isnull=True)

    prediction_geocodes = qs.values_list(
        f"adm{adm_level}__geocode", flat=True
    ).distinct()

    if adm_level == 2:
        cities = Adm2.objects.filter(
            geocode__in=prediction_geocodes,
            adm1__geocode=state,
            adm1__country__geocode=country,
        )
    else:
        cities = Adm2.objects.none()

    return cities.distinct()


@router.get(
    "/dashboard/sprints/",
    response=List[schema.DashboardSprintOut],
    auth=auth,
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
    perm = can_manage_filter(request.auth, prefix="repositorymodel__predicts")

    qs = Sprint.objects.filter(
        perm,
        repositorymodel__predicts__disease__code=disease,
        repositorymodel__predicts__adm_level=adm_level,
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
    auth=auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_predictions(
    request,
    category: str,
    adm_level: int,
    disease: str,
    case_definition: Literal["reported", "probable"],
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
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

    perm = can_manage_filter(request.auth)

    qs = QuantitativePrediction.objects.filter(
        perm,
        disease__code=disease,
        adm_level=adm_level,
        model__category__in=categories,
    )

    if sprint:
        qs = qs.filter(model__sprint__isnull=False, case_definition="probable")
    else:
        qs = qs.filter(
            model__sprint__isnull=True, case_definition=case_definition
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
    "/dashboard/prediction/{prediction_id}/metadata/",
    response={200: dict, 404: NotFoundSchema},
    auth=auth,
    include_in_schema=False,
)
@decorate_view(never_cache)
def dashboard_prediction_meta(request, prediction_id: int):
    perm = can_manage_filter(request.auth)
    try:
        prediction = (
            QuantitativePrediction.objects.filter(perm)
            .select_related("model__sprint")
            .get(id=prediction_id)
        )
    except QuantitativePrediction.DoesNotExist:
        return 404, {
            "message": f"Prediction #{prediction_id} not found or unauthorized"
        }

    return {
        "id": prediction.id,
        "disease_code": prediction.disease.code,
        "adm_level": prediction.adm_level,
        "case_definition": prediction.case_definition,
        "adm_0_code": prediction.adm0.geocode if prediction.adm0 else None,
        "adm_1_code": prediction.adm1.geocode if prediction.adm1 else None,
        "adm_2_code": prediction.adm2.geocode if prediction.adm2 else None,
        "sprint": prediction.model.sprint is not None,
    }


@router.get(
    "/dashboard/prediction/{prediction_id}/",
    response=List[schema.DashboardQuantitativePredictionOut],
    auth=auth,
    include_in_schema=False,
)
def dashboard_prediction(request, prediction_id: int):
    perm = can_manage_filter(request.auth)

    if not QuantitativePrediction.objects.filter(
        perm, id=prediction_id
    ).exists():
        return []

    return QuantitativePredictionRow.objects.filter(
        prediction_id=prediction_id
    ).order_by("date")


@router.get(
    "/dashboard/cases/",
    response=List[schema.HistoricoAlertaCases],
    auth=auth,
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

    case_definition = payload.case_definition

    if payload.sprint:
        case_definition = "probable"

    df = hist_alerta_data(
        case_definition=case_definition,
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
