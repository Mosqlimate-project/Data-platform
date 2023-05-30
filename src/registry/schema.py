from ninja import Schema
from ninja.orm import create_schema

from .models import Author

AuthorSchema = create_schema(Author)

class NotFoundSchema(Schema):
    message: str
