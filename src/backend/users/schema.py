from ninja import Schema


class UserSchema(Schema):
    name: str
    username: str


class UserInPost(Schema):
    """Input for POST update request's body"""

    first_name: str
    last_name: str
