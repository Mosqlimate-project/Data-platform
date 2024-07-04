from math import inf
from typing import Any, List

import asyncio
from ninja.pagination import AsyncPaginationBase
from ninja import Schema, Field
from ninja.conf import settings
from django.db.models import QuerySet


class PagesPagination(AsyncPaginationBase):
    """
    Pagination formula:
        "Total pages" = ("Query" // "Per page") (+ 1)
        NOTE: + 1 if there are leftovers

    Slicing:
        result = "Query"[("Page"-1) * "Per Page" : "Page" * "Per page"]

    Example:
        query: 42 objects
        per page: 5

        total pages = (42//5)+1 = 9

        page 1 = query[0:5]
        page 2 = query[5:10]
        page 3 = query[10:15]
        ...
        page 9 = query[40:45]

    Notes:
        - If the requested page is < 1 or > last page, return rather 1 or last page
    """

    max_per_page: int = 300

    class Input(Schema):
        page: int = 1
        per_page: int = 300

    class Output(Schema):
        items: List[Any]
        pagination: dict
        message: str

    def paginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        total_items: int = self._items_count(queryset)
        page: int = pagination.page
        per_page: int = pagination.per_page
        max_per_page = self.max_per_page
        message: str = ""

        if per_page > max_per_page:
            per_page = max_per_page
            message = (
                "Maximum items per page exceeded, "
                f"displaying {max_per_page} results per page"
            )
            # TODO: Define a better way of sending multiple message and its scope
        elif per_page < 1:
            per_page = 1
            message = "The minimum items per page is 1"

        total_pages: int = total_items // per_page

        if total_pages * per_page < total_items:
            total_pages += 1  # Handles the incomplete page
        elif total_pages < 1:
            total_pages = 1

        if page < 1:
            page = 1
            message = "Incorrect page, displaying page 1"
        elif page > total_pages:
            page = total_pages
            message = f"Incorrect page, displaying page {page}"

        items = queryset[(page - 1) * per_page : page * per_page]

        return {
            "items": items,
            "pagination": {
                "items": self._aitems_count(queryset),
                "total_items": total_items,
                "page": page,
                "total_pages": total_pages,
                "per_page": per_page,
            },
            "message": message,
        }

    async def apaginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        offset = pagination.offset
        limit: int = min(pagination.limit, settings.PAGINATION_MAX_LIMIT)
        return {
            "items": queryset[offset : offset + limit],
            "count": await self._aitems_count(queryset),
        }  # noqa: E203


class LimitOffsetPagination(AsyncPaginationBase):
    class Input(Schema):
        limit: int = Field(
            settings.PAGINATION_PER_PAGE,
            ge=1,
            le=settings.PAGINATION_MAX_LIMIT
            if settings.PAGINATION_MAX_LIMIT != inf
            else None,
        )
        offset: int = Field(0, ge=0)

    async def paginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        if asyncio.iscoroutine(queryset):
            print("it is")
            return await self.apaginate_queryset(
                queryset, pagination, **params
            )
        print("it is not")

        offset = pagination.offset
        limit: int = min(pagination.limit, settings.PAGINATION_MAX_LIMIT)
        return {
            "items": queryset[offset : offset + limit],
            "count": self._items_count(queryset),
        }

    async def apaginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        offset = pagination.offset
        limit: int = min(pagination.limit, settings.PAGINATION_MAX_LIMIT)
        return {
            "items": queryset[offset : offset + limit],
            "count": await self._aitems_count(queryset),
        }  # noqa: E203
