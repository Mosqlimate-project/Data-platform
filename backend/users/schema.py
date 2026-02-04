from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, field_validator
from pydantic.networks import validate_email
from pydantic_core import PydanticCustomError

from ninja import Schema


class ProfileModelOut(Schema):
    id: int
    name: str
    owner: str
    provider: str
    category: str
    disease: str
    can_manage: bool
    active: bool


class ProfileIn(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    homepage: Optional[str] = None


class ProfileOut(Schema):
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    homepage: Optional[str] = None
    avatar_url: Optional[str] = None


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
    oauth_data: Optional[str] = None
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


class RepositoryOut(Schema):
    id: str
    name: str
    url: str
    private: bool
    provider: Literal["gitlab", "github"]
    available: bool
