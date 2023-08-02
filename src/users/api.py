from ninja import Router, Schema, Form
from ninja.security import django_auth

from .models import CustomUser
from .schema import UserInPost, UserSchema
from main.schema import ForbiddenSchema, NotFoundSchema
from registry.schema import ModelSchema
from registry.models import Author, Model
from registry.utils import calling_via_swagger

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
            return 403, {"message": "You are not authorized to update this user."}

        user.first_name = payload.first_name
        user.last_name = payload.last_name
        user.save()
        return 201, user
    except CustomUser.DoesNotExist:
        return 404, {"message": "Author not found"}


class UpdateModelForm(Schema):
    # author: str
    name: str
    description: str = None
    repository: str
    language: str
    type: str


@router.put(
    "/models/{model_id}",
    response={201: ModelSchema, 403: ForbiddenSchema, 404: NotFoundSchema},
    auth=django_auth,
    include_in_schema=False,
)
def update_model(request, model_id: int, payload: UpdateModelForm = Form(...)):
    try:
        model = Model.objects.get(pk=model_id)

        if request.user != model.author.user:  # TODO: allow admins here
            return 403, {"message": "You are not authorized to update this Model"}

        try:
            for attr, value in payload.items():
                setattr(model, attr, value)

            if not calling_via_swagger(request):
                # Not realy required, since include_in_schema=False
                model.save()

            return 201, model
        except Author.DoesNotExist:
            return 404, {
                "message": (
                    f"Author '{payload.author}' not found, use username instead"
                )
            }
    except Model.DoesNotExist:
        return 404, {"message": "Model not found"}
