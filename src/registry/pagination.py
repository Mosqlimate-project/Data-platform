from functools import wraps
import asyncio
from ninja.pagination import PaginationBase
from ninja import Schema, Field
from typing import Any, List
from abc import abstractmethod
from django.db.models import QuerySet
from ninja.conf import settings
from math import inf
from asgiref.sync import sync_to_async


class PagesPagination(PaginationBase):
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
        queryset,
        pagination: Input,
        **params: Any,
    ) -> Any:
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
                "items": len(items),
                "total_items": total_items,
                "page": page,
                "total_pages": total_pages,
                "per_page": per_page,
            },
            "message": message,
        }


class AsyncPaginationBase(PaginationBase):
    @abstractmethod
    async def apaginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Any,
        **params: Any,
    ) -> Any:
        pass  # pragma: no cover

    async def _aitems_count(self, queryset: QuerySet) -> int:
        try:
            return await queryset.all().acount()
        except AttributeError:
            return len(queryset)


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

    def paginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        print("paginate_queryset: " + str(queryset))
        print(type(queryset))
        if asyncio.iscoroutine(queryset):
            print("it is")
            return sync_to_async(
                self.apaginate_queryset(queryset, pagination, **params)
            )
        print("its not")
        offset = pagination.offset
        limit: int = min(pagination.limit, settings.PAGINATION_MAX_LIMIT)
        return {
            "items": queryset[offset : offset + limit],
            "count": self._items_count(queryset),
        }  # noqa: E203

    async def apaginate_queryset(
        self,
        queryset: QuerySet,
        pagination: Input,
        **params: Any,
    ) -> Any:
        print("apaginate_queryset: " + str(queryset))
        offset = pagination.offset
        limit: int = min(pagination.limit, settings.PAGINATION_MAX_LIMIT)
        return {
            "items": queryset[offset : offset + limit],
            "count": await self._aitems_count(queryset),
        }  # noqa: E203


def paginate(paginator_class):
    def decorator(func):
        print(f"Decorating function: {func.__name__}")
        print(f"Is coroutine function: {asyncio.iscoroutinefunction(func)}")
        if asyncio.iscoroutinefunction(func):
            print("its corroutine 'paginate'")

            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                request = args[0]
                paginator = paginator_class()
                pagination_input = paginator.Input(**request.GET)
                queryset = await func(*args, **kwargs)
                if asyncio.iscoroutine(queryset):
                    paginated_result = await paginator.apaginate_queryset(
                        queryset, pagination_input
                    )
                else:
                    paginated_result = paginator.paginate_queryset(
                        queryset, pagination_input
                    )
                return paginated_result

            return async_wrapper
        else:
            print("not corroutine 'paginate'")

            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                request = args[0]
                paginator = paginator_class()
                pagination_input = paginator.Input(**request.GET)
                queryset = func(*args, **kwargs)
                paginated_result = paginator.paginate_queryset(
                    queryset, pagination_input
                )
                return paginated_result

            return sync_wrapper

    return decorator
