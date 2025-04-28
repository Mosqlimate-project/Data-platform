from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from ninja.errors import HttpError


User = get_user_model()


def authorize(request) -> User:
    docs_url = request.build_absolute_uri(reverse("docs"))
    header_key = request.headers.get("X-UID-Key", None)
    session_key = cache.get(request.session.session_key, None)
    username, key = None, None

    if ":" in str(header_key):
        username, key = header_key.split(":")

    if ":" in str(session_key):
        username, key = session_key.split(":")

    if not username or not key:
        raise HttpError(401, f"Unauthorized. See {docs_url}")

    try:
        user = User.objects.get(username=str(username))
        assert user.api_key() == header_key or session_key
    except (User.DoesNotExist, AssertionError):
        raise HttpError(401, f"Unauthorized. See {docs_url}")

    return user
