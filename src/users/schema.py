from typing_extensions import Annotated

from ninja import Schema, Field


class UserSchema(Schema):
    name: Annotated[str, Field(description="User's full name")]
    username: Annotated[
        str,
        Field(description="User's username. Fetched via GitHub integration"),
    ]


class UserInPost(Schema):
    """Input for POST update request's body"""

    first_name: str
    last_name: str
