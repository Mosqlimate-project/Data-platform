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
        total_predictions: int = self._items_count(queryset)
        page: int = pagination.page
        per_page: int = pagination.per_page
        message: str = ""

        if per_page > 50:
            per_page = 50
            message = (
                "Maximum Predictions per page exceeded, displaying 50 results per page"
            )
        elif per_page < 1:
            per_page = 1
            message = "The minimum Predictions per page is 1"

        total_pages: int = (total_predictions // per_page) + 1

        if page < 1:
            page = 1
            message = "Incorrect page, displaying page 1"
        elif page > total_pages:
            page = total_pages
            message = f"Incorrect page, displaying page {page}"

        predictions = queryset[(page - 1) * per_page : page * per_page]

        return {
            "items": predictions,
            "pagination": {
                "total_predictions": total_predictions,
                "total_pages": total_pages,
                "page": page,
                "per_page": per_page,
            },
            "message": message,
        }
