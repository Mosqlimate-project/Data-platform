from typing import List, Optional
from ninja import Router

from .models import Author
from .schema import Schema, AuthorSchema, NotFoundSchema


router = Router()

# [Model] Author
class AuthorIn(Schema):
    """ Input for the request's body """
    name: str
    email: str
    institution: str


@router.get('/authors/', response=List[AuthorSchema])
def list_authors(request, name: Optional[str] = None):
    """ Lists all authors, can be filtered by name """
    if name:
        return Author.objects.filter(name__icontains=name)
    return Author.objects.all()


@router.get('/authors/{author_id}', response={200: AuthorSchema, 404: NotFoundSchema})
def get_author(request, author_id: int):
    """ Gets author by id """
    try:
        author = Author.objects.get(pk=author_id)
        return (200, author)
    except Author.DoesNotExist as e:
        return (404, {"message": "Author not found"})


@router.post('/authors/', response={201: AuthorSchema})
def create_author(request, payload: AuthorIn):
    """ Posts author to database """
    author = Author.objects.create(**payload.dict())
    return (201, author)


@router.put('/authors/{author_id}', response={200: AuthorSchema, 404: NotFoundSchema})
def update_author(request, author_id: int, payload: AuthorIn):
    """ Updates author """
    try:
        author = Author.objects.get(pk=author_id)
    
        for attr, value in payload.dict().items():
            setattr(author, attr, value)
    
        author.save()
        return (200, author)
    except Author.DoesNotExist as e:
        return (404, {"message": "Author not found"})


@router.delete('/authors/{author_id}', response={204: None, 404: NotFoundSchema})
def delete_author(request, author_id: int):
    """ Deletes author """
    try:
        author = Author.objects.get(pk=author_id)
        author.delete()
        return 200
    except Author.DoesNotExist as e:
        return (404, {"message": "Author not found"})


# [Model] Model
class ModelSchemaIn(Schema):
    name: str
