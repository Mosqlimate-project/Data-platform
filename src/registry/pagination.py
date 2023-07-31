from ninja.pagination import PaginationBase
from ninja import Schema
from typing import Any, List


class PredictionsPagination(PaginationBase):
    class Input(Schema):
        page: int
        per_page: int

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
        total_predictions: int = self._items_count(queryset)
        page: int = pagination.page
        per_page: int = pagination.per_page
        message: str = ""

        if per_page > 50:
            per_page = 50
            message = (
                "Maximum Predictions per page exceeded, displaying 50 results per page"
            )
            # TODO: Define a better way of sending multiple message and its scope
        elif per_page < 1:
            per_page = 1
            message = "The minimum Predictions per page is 1"

        total_pages: int = total_predictions // per_page

        if total_pages * per_page < total_predictions:
            total_pages += 1  # Handles the incomplete page

        if page < 1:
            page = 1
            message = "Incorrect page, displaying first page"
        elif page > total_pages:
            page = total_pages
            message = "Incorrect page, displaying last page"

        predictions = queryset[(page - 1) * per_page : page * per_page]

        return {
            "items": predictions,
            "pagination": {
                "predictions": len(predictions),
                "total_predictions": total_predictions,
                "page": page,
                "total_pages": total_pages,
                "per_page": per_page,
            },
            "message": message,
        }
