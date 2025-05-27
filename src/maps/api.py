from ninja import Router

from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from users.auth import UidKeyAuth
from .views import CentroidTest


router = Router()
uidkey_auth = UidKeyAuth()


@router.get("/test/{z}/{x}/{y}.pbf")
@csrf_exempt
def test(request: HttpRequest, z: int, x: int, y: int) -> HttpResponse:
    view = CentroidTest.as_view()
    return view(request, z=z, x=x, y=y)
