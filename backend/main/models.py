from typing import Optional

from django.db import models
from django.http.request import HttpRequest
from django.contrib.auth import get_user_model

from mosqlimate.api import authorize


User = get_user_model()


class APILog(models.Model):
    METHODS = [
        ("GET", "get"),
        ("POST", "post"),
        ("PUT", "put"),
        ("DELETE", "delete"),
    ]

    date = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        to=User, on_delete=models.CASCADE, related_name="logs", null=False
    )
    method = models.CharField(
        max_length=10, choices=METHODS, blank=False, null=False
    )
    endpoint = models.CharField(max_length=512, null=False, blank=False)
    params = models.JSONField()

    def __str__(self):
        return f"[{self.method}] {self.endpoint} {self.user.username}"

    @staticmethod
    def from_request(request: HttpRequest, user: Optional[User] = None):
        if not request.path.startswith("/api/"):
            return

        method = request.method

        if not user:
            user = authorize(request)

        match method:
            case "GET":
                params = request.GET.dict()
            case "POST":
                params = request.POST.dict()
            case "PUT" | "DELETE":
                params = {}
                print(request.body)
                # NOTE: request parameters are passed via body. Not sure if it
                # should be logged
            case _:
                raise NotImplementedError()

        log = APILog(
            user=user,
            method=method,
            endpoint=request.path,
            params=params,
        )
        log.save()
        return log
