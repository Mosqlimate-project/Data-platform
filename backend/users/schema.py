from typing_extensions import Annotated
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, field_validator
from pydantic.networks import validate_email
from pydantic_core import PydanticCustomError

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


class LoginIn(BaseModel):
    identifier: str
    password: str

    @field_validator("identifier")
    def normalize_identifier(cls, v):
        v = v.strip()
        try:
            validate_email(v)
            return v
        except PydanticCustomError:
            return v


class LoginOut(Schema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterIn(Schema):
    provider: Optional[Literal["google", "github", "gitlab"]] = None
    provider_id: Optional[str] = None
    raw_info: Optional[dict] = None
    avatar_url: Optional[str] = None
    homepage_url: Optional[str] = None
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class UserOut(Schema):
    username: str
    email: str


class RefreshIn(Schema):
    refresh_token: str
