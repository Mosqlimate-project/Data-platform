from ninja import NinjaAPI

from registry.api import router as registry_router

api = NinjaAPI(csrf=True)

api.add_router("/registry/", router=registry_router)
