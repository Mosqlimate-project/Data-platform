from ninja.pagination import PaginationBase
from ninja import Schema
from typing import Any, List, Optional


class PagesPagination(PaginationBase):
    max_per_page: int = 300

    class Input(Schema):
        page: int = 1
        per_page: int = 300

    class Output(Schema):
        items: Optional[List[Any]] = None
        pagination: Optional[dict] = None
        message: Optional[str] = None
        error: Optional[str] = None

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
