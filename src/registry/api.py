from typing import List

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.orm import create_schema

from .models import Author


router = Router()

AuthorSchema = create_schema(Author)

class AuthorSchemaIn(Schema):
    """ 
    An Author object placeholder to be used in the requests,
    it prevents the requirement of all Author's attributes. 
    """
    name: str


@router.get('/authors/', response=List[AuthorSchema])
def list_authors(request):
    """ List all authors """
    res = Author.objects.all()
    return res


@router.get('/authors/{id}', response=AuthorSchema)
def get_author(request, id: int):
    """ Get author by id """
    author = get_object_or_404(Author, id=id)
    return author

@router.post('/authors/', response={201: AuthorSchema})
def create_author(request, payload: AuthorSchemaIn):
    """ Post author to database """
    author = Author.objects.create(**payload.dict())
    return (201, author)

@router.put('/authors/{id}', response=AuthorSchema)
def update_author(request, id: int, payload: AuthorSchemaIn):
    """ Update author """
    author = get_object_or_404(Author, id=id)

    for attr, value in payload.dict().items():
        setattr(author, attr, value)
    
    author.save()
    return author

@router.delete('/authors/{id}', response={204: None})
def delete_author(request, id: int):
    author = get_object_or_404(Author, id=id)
    author.delete()
    return (204, None)
