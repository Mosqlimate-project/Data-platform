import os
import json

from ninja import Router, Swagger
from ninja import NinjaAPI as API
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token

from registry.api import router as registry_router
from datastore.api import router as datastore_router
from vis.api import router as vis_router
from users.api import router as users_router
from main.APILog.api import router as log_router
from users.auth import InvalidUIDKey
from main.schema import NotFoundSchema, MunicipalityInfoSchema, StateInfoSchema
from main.utils import UF_CODES, UFs

os.environ["NINJA_SKIP_REGISTRY"] = "yes"

MUN_FILE = settings.BASE_DIR / "static/data/geo/BR/municipios.json"
with open(MUN_FILE, "r") as file:
    MUN_DATA = json.load(file)


class NinjaAPI(API):
    def get_openapi_schema(self, **kwargs) -> dict:
        schema = super().get_openapi_schema(**kwargs)
        schema.pop("BadRequestSchema", None)
        return schema


api = NinjaAPI(
    title="Mosqlimate API",
    description=(
        "<h3>Welcome to Mosqlimate API Reference</h3>"
        "<p>In <a href=/api/docs>API Demo</a>, you can test the API calls to "
        "Mosqlimate's Platform. Note that the POST calls won't save any result"
        " in the database.</p>"
        "<p>See <a href=/docs/overview>API Overview</a> to more detailed "
        "information about the endpoints.</p>"
        "<p>See <a href=/docs/uid-key>Authorization</a> to check how to "
        "authenticate using your Api Key.</p>"
    ),
    version="1",
    docs=Swagger(),
    docs_url="/docs",
)

router = Router()

api.add_router("/", router=router)
api.add_router("/registry/", router=registry_router)
api.add_router("/user/", router=users_router)
api.add_router("/datastore/", router=datastore_router)
api.add_router("/vis/", router=vis_router)
api.add_router("/log/", router=log_router)


@router.get("/status/", include_in_schema=False)
@csrf_exempt
def status(request):
    return 200, {"status": "ok"}


@router.get("/session_key/", include_in_schema=False)
@csrf_exempt
def get_session_key(request):
    if not request.session.session_key:
        request.session.create()
    return {"session_key": request.session.session_key}


@router.get("/csrf/", include_in_schema=False)
@csrf_exempt
@never_cache
def get_csrf_token(request):
    token = get_token(request)
    response = JsonResponse({"csrf_token": token})
    response.set_cookie(
        "csrftoken",
        token,
        max_age=31449600,
        httponly=False,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/",
    )
    return response


@api.exception_handler(InvalidUIDKey)
def on_invalid_token(request, exc):
    return api.create_response(
        request,
        {"detail": "Unauthorized. See documentation"},
        status=401,
    )


@router.get(
    "/state_info/",
    response={200: StateInfoSchema, 404: NotFoundSchema},
    include_in_schema=False,
)
@csrf_exempt
def get_state_info(request, geocode):
    codes_uf = {v: k for k, v in UF_CODES.items()}
    state_info = {}

    try:
        state_info["uf"] = codes_uf[int(geocode)]
        state_info["name"] = UFs[state_info["uf"]]
    except (KeyError, ValueError):
        return 404, {"message": f"Unknown geocode: {geocode}"}

    return 200, state_info


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
