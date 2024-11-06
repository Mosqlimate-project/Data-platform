from ninja import Router
from ninja.security import django_auth

from main.schema import ForbiddenSchema, NotFoundSchema

from .models import CustomUser
from .schema import UserInPost, UserSchema

router = Router()


@router.put(
    "/{username}",
    response={201: UserSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    include_in_schema=False,
)
def update_user(request, username: str, payload: UserInPost):
    """
    Updates User. It is not possible to change User's username nor email.
    To change a User's name, updates its first_name and last_name, which
    were inherit from a 3rd party OAuth User
    """
    try:
        user = CustomUser.objects.get(username=username)

        if request.user != user:  # TODO: Enable admins here
            return 403, {
                "message": "You are not authorized to update this user."
            }

        user.first_name = payload.first_name
        user.last_name = payload.last_name
        user.save()
        return 201, user
    except CustomUser.DoesNotExist:
        return 404, {"message": "Author not found"}
