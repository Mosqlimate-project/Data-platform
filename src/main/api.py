from ninja import NinjaAPI
from registry.api import router as registry_router
from users.api import router as users_router


api = NinjaAPI(csrf=True)

api.add_router("/registry/", router=registry_router)
api.add_router("/accounts/", router=users_router)
