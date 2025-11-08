from typing_extensions import Annotated
from typing import Optional
from pydantic import EmailStr

from ninja import Schema, Field


class OauthUser(Schema):
    name: Optional[str]
    last_name: Optional[str]


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


class LoginIn(Schema):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str


class LoginOut(Schema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterIn(Schema):
    name: str
    username: str
    password: str
    email: EmailStr


class UserOut(Schema):
    username: str
    email: str


class RefreshOut(Schema):
    access_token: str = None
    token_type: str = "bearer"
