import os
from ninja import NinjaAPI

from registry.api import router as registry_router
from users.api import router as users_router
from datastore.api import router as datastore_router
from users.auth import InvalidUIDKey
from django.urls import reverse


os.environ["NINJA_SKIP_REGISTRY"] = "yes"

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

api.add_router("/registry/", router=registry_router)
api.add_router("/user/", router=users_router)
api.add_router("/datastore/", router=datastore_router)


@api.exception_handler(InvalidUIDKey)
def on_invalid_token(request, exc):
    docs_url = request.build_absolute_uri(reverse("docs"))
    return api.create_response(
        request,
        {"detail": f"Unauthorized. See {docs_url}"},
        status=401,
    )
