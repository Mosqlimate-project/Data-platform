from typing_extensions import Annotated
from typing import Optional

from ninja import Schema, Field


class UserSchema(Schema):
    name: Annotated[Optional[str], Field(None, description="User's full name")]
    username: Annotated[
        str,
        Field(description="User's username. Fetched via GitHub integration"),
    ]


class UserInPost(Schema):
    """Input for POST update request's body"""

    first_name: str
    last_name: str
