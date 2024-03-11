import os
import json

from django.urls import reverse
from ninja import NinjaAPI, Router, Schema
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.http import HttpResponse

from registry.api import router as registry_router
from datastore.api import router as datastore_router
from vis.api import router as vis_router
from users.api import router as users_router
from users.auth import InvalidUIDKey
from main.schema import NotFoundSchema
from main.utils import UF_CODES, UFs

os.environ["NINJA_SKIP_REGISTRY"] = "yes"

MUN_FILE = settings.BASE_DIR / "static/data/geo/BR/municipios.json"
with open(MUN_FILE, "r") as file:
    MUN_DATA = json.load(file)

api = NinjaAPI(
    csrf=True,
    title="API Demo",
    description=(
        "<h3>This is a demonstration of Mosqlimate API.</h3>"
        "POST calls won't generate any result on database."
        "<br>"
        "<p>See <a href=/docs/>Documentation</a> to more information.</h4></p>"
    ),
    version="1",
)

router = Router()

api.add_router("/", router=router)
api.add_router("/registry/", router=registry_router)
api.add_router("/user/", router=users_router)
api.add_router("/datastore/", router=datastore_router)
api.add_router("/vis/", router=vis_router)


@api.exception_handler(InvalidUIDKey)
def on_invalid_token(request, exc):
    docs_url = request.build_absolute_uri(reverse("docs"))
    return api.create_response(
        request,
        {"detail": f"Unauthorized. See {docs_url}"},
        status=401,
    )


class MunicipalityInfoSchema(Schema):
    municipio: str
    codigo_uf: int
    uf: str
    uf_nome: str
    fuso_horario: str
    latitude: float
    longitude: float


@router.get(
    "/city_info/",
    response={200: MunicipalityInfoSchema, 404: NotFoundSchema},
    include_in_schema=False,
)
@csrf_exempt
def get_municipality_info(request, geocode):
    try:
        mun_info = MUN_DATA[str(geocode)]
    except KeyError:
        return 404, {"message": f"Unknown geocode: {geocode}"}

    codes_uf = {v: k for k, v in UF_CODES.items()}
    uf_code = mun_info["codigo_uf"]
    mun_info["uf"] = codes_uf[int(uf_code)]
    mun_info["uf_nome"] = UFs[codes_uf[int(uf_code)]]

    return 200, mun_info


@router.get(
    "/mosqlimate-logo/",
    include_in_schema=False,
)
@csrf_exempt
def get_mosqlimate_logo(request):
    logo_path = os.path.join(settings.STATIC_ROOT, "img/logo-mosqlimate.png")
    with open(logo_path, "rb") as f:
        return HttpResponse(f.read(), content_type="image/jpeg")
