from django.urls import reverse
from urllib.parse import urlparse


def calling_via_swagger(request):
    """Checks if the API call has been done via /api/docs/"""
    api_docs = reverse("api-1:openapi-view")
    api_call_path = urlparse(request.headers.get("Referer")).path
    return api_call_path == api_docs
