from typing import Any

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin

from .selectors import get_table_by_id, get_table_counts, list_tables
from .serializers import (
    TableCreateSerializer,
    TableListSerializer,
    TableSerializer,
    TableUpdateSerializer,
)
from .services import create_table, update_table


class TableListCreateView(APIView):
    def get_permissions(self) -> list[Any]:
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    @extend_schema(
        operation_id="listTables",
        tags=["tables"],
        parameters=[
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="is_active", type=bool, required=False),
        ],
        responses={200: TableListSerializer},
    )
    def get(self, request: Request) -> Response:
        role = str(getattr(request.user, "role", "CASHIER"))
        status_param = request.query_params.get("status")
        is_active_param_raw = request.query_params.get("is_active")

        is_active_param: bool | None = None
        if is_active_param_raw is not None:
            is_active_param = is_active_param_raw.lower() == "true"

        tables = list_tables(user_role=role, is_active=is_active_param, status_filter=status_param)
        counts = get_table_counts(user_role=role)
        serializer = TableSerializer(tables, many=True)
        return Response(
            {"items": serializer.data, "counts": counts},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        operation_id="createTable",
        tags=["tables"],
        request=TableCreateSerializer,
        responses={201: TableSerializer},
    )
    def post(self, request: Request) -> Response:
        role = str(getattr(request.user, "role", "ADMIN"))
        serializer = TableCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        table = create_table(serializer.validated_data, user_role=role)
        out_serializer = TableSerializer(table)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class TableDetailView(APIView):
    def get_permissions(self) -> list[Any]:
        if self.request.method == "PATCH":
            return [IsAdmin()]
        return [IsAuthenticated()]

    @extend_schema(
        operation_id="getTable",
        tags=["tables"],
        responses={200: TableSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        role = str(getattr(request.user, "role", "CASHIER"))
        table = get_table_by_id(id, user_role=role)
        serializer = TableSerializer(table)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateTable",
        tags=["tables"],
        request=TableUpdateSerializer,
        responses={200: TableSerializer},
    )
    def patch(self, request: Request, id: int) -> Response:
        role = str(getattr(request.user, "role", "ADMIN"))
        table = get_table_by_id(id, user_role=role)
        serializer = TableUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_table(table, serializer.validated_data, user_role=role)
        out_serializer = TableSerializer(updated)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
