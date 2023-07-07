from ninja import NinjaAPI

from registry.api import router as registry_router
from users.api import router as users_router
from users.auth import InvalidUIDKey
from django.urls import reverse


api = NinjaAPI(
    csrf=True,
    title="API Demo",
    description=(
        "<h3>This is a demonstration of Mosqlimate API.</h3>"
        "POST calls won't generate any result on database."
        "<br>"
        "<p>See <a href=/docs/>Documentation</a> to more information.</h4></p>"
    ),
)

api.add_router("/registry/", router=registry_router)
api.add_router("/accounts/", router=users_router)


@api.exception_handler(InvalidUIDKey)
def on_invalid_token(request, exc):
    docs_url = request.build_absolute_uri(reverse("docs"))
    return api.create_response(
        request,
        {"detail": f"Unauthorized. See {docs_url}"},
        status=401,
    )
