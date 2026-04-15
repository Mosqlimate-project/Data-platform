from ninja import Router
from django.http import HttpRequest
from django.contrib.gis.db.models.functions import AsGeoJSON
from users.auth import UidKeyAuth
from vis.brasil.models import GeoCity

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
