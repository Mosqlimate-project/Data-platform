from ninja import Router, Query
from django.http import HttpRequest
from django.contrib.gis.db.models.functions import AsGeoJSON
from users.auth import UidKeyAuth
from vis.brasil.models import GeoCity, GeoState

router = Router()


@router.get(
    "/cities/{uf}",
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def get_city_boundaries(request: HttpRequest, uf: str):
    cities = GeoCity.objects.filter(
        city__microregion__mesoregion__state__uf__iexact=uf
    ).annotate(geojson=AsGeoJSON("geometry"))

    features = []
    for city in cities:
        features.append(
            {
                "type": "Feature",
                "geometry": city.geojson,
                "properties": {
                    "geocode": city.city.geocode,
                    "name": city.city.name,
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


@router.get(
    "/states",
    auth=UidKeyAuth(),
    include_in_schema=False,
)
def get_state_boundaries(request: HttpRequest, uf: list[str] = Query(None)):
    states = GeoState.objects.all()

    if uf:
        states = states.filter(state__uf__in=[u.upper() for u in uf])

    states = states.annotate(geojson=AsGeoJSON("geometry"))

    features = []
    for state in states:
        features.append(
            {
                "type": "Feature",
                "geometry": state.geojson,
                "properties": {
                    "geocode": state.state.geocode,
                    "name": state.state.name,
                    "sigla": state.state.uf,
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}
