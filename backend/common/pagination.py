"""Page-number pagination producing {"items": [...], "pagination": {...}} inside `data` (ADR-0010)."""

import math
from typing import Any

from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class PaginationSerializer(serializers.Serializer[dict[str, int]]):
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_items = serializers.IntegerField()
    total_pages = serializers.IntegerField()


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_data(self, data: Any) -> dict[str, Any]:
        if self.page is None:
            raise RuntimeError("paginate_queryset() must run first")
        total = self.page.paginator.count
        size = self.get_page_size(self.request) or self.page_size  # type: ignore[arg-type]
        return {
            "items": data,
            "pagination": {
                "page": self.page.number,
                "page_size": size,
                "total_items": total,
                "total_pages": max(1, math.ceil(total / size)) if size else 1,
            },
        }

    def get_paginated_response(self, data: Any) -> Response:
        return Response(self.get_paginated_data(data))

    def get_paginated_response_schema(self, schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["items", "pagination"],
            "properties": {
                "items": schema,
                "pagination": {"$ref": "#/components/schemas/Pagination"},
            },
        }
