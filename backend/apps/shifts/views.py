from typing import Any

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination

from .selectors import get_current_shift, get_shift_by_id, list_shifts
from .serializers import (
    ShiftCloseSerializer,
    ShiftOpenSerializer,
    ShiftPageSerializer,
    ShiftSerializer,
    ShiftSummarySerializer,
)
from .services import close_shift, open_shift


class ShiftListOpenView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listShifts",
        tags=["shifts"],
        parameters=[
            OpenApiParameter(name="cashier_id", type=int, required=False),
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="date_from", type=str, required=False),
            OpenApiParameter(name="date_to", type=str, required=False),
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses={200: ShiftPageSerializer},
    )
    def get(self, request: Request) -> Response:
        cashier_id_raw = request.query_params.get("cashier_id")
        cashier_id = int(cashier_id_raw) if cashier_id_raw else None
        shift_status = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        qs = list_shifts(
            user=request.user,
            cashier_id=cashier_id,
            status_filter=shift_status,
            date_from=date_from,
            date_to=date_to,
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = ShiftSummarySerializer(page, many=True)
        resp_data = paginator.get_paginated_data(serializer.data)
        return Response(resp_data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="openShift",
        tags=["shifts"],
        request=ShiftOpenSerializer,
        responses={201: ShiftSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = ShiftOpenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        opening_balance = serializer.validated_data.get("opening_balance_minor", 0)
        shift = open_shift(request.user, opening_balance)
        out_serializer = ShiftSerializer(shift)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class CurrentShiftView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getCurrentShift",
        tags=["shifts"],
        responses={200: ShiftSerializer},
    )
    def get(self, request: Request) -> Response:
        shift = get_current_shift(request.user)
        if shift is None:
            return Response(None, status=status.HTTP_200_OK)
        serializer = ShiftSerializer(shift)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShiftDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getShift",
        tags=["shifts"],
        responses={200: ShiftSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        shift = get_shift_by_id(id, request.user)
        serializer = ShiftSerializer(shift)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShiftCloseView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="closeShift",
        tags=["shifts"],
        request=ShiftCloseSerializer,
        responses={200: ShiftSerializer},
    )
    def post(self, request: Request, id: int) -> Response:
        serializer = ShiftCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        counted_cash = serializer.validated_data["counted_cash_minor"]
        shift = close_shift(request.user, id, counted_cash)
        out_serializer = ShiftSerializer(shift)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
