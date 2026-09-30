
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination

from .selectors import get_order_by_id, get_today_counts, list_orders
from .serializers import (
    OrderCancelSerializer,
    OrderCreateSerializer,
    OrderListItemSerializer,
    OrderPageSerializer,
    OrderSerializer,
    OrderUpdateSerializer,
)
from .services import cancel_order, create_order, update_order


class OrderListCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listOrders",
        tags=["orders"],
        parameters=[
            OpenApiParameter(name="cashier_id", type=int, required=False),
            OpenApiParameter(name="payment_method", type=str, required=False),
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="shift_id", type=int, required=False),
            OpenApiParameter(name="date_from", type=str, required=False),
            OpenApiParameter(name="date_to", type=str, required=False),
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses={200: OrderPageSerializer},
    )
    def get(self, request: Request) -> Response:
        cashier_id_raw = request.query_params.get("cashier_id")
        cashier_id = int(cashier_id_raw) if cashier_id_raw else None
        shift_id_raw = request.query_params.get("shift_id")
        shift_id = int(shift_id_raw) if shift_id_raw else None

        qs = list_orders(
            user=request.user,
            cashier_id=cashier_id,
            payment_method=request.query_params.get("payment_method"),
            status=request.query_params.get("status"),
            shift_id=shift_id,
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
            search=request.query_params.get("search"),
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = OrderListItemSerializer(page, many=True)
        resp_data = paginator.get_paginated_data(serializer.data)
        resp_data["today_counts"] = get_today_counts(user=request.user)

        return Response(resp_data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="createOrder",
        tags=["orders"],
        request=OrderCreateSerializer,
        responses={201: OrderSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = create_order(
            user=request.user,
            order_type=serializer.validated_data["type"],
            table_id=serializer.validated_data.get("table_id"),
            lines_data=serializer.validated_data["lines"],
            discount_minor=serializer.validated_data.get("discount_minor", 0),
        )
        out_serializer = OrderSerializer(order)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getOrder",
        tags=["orders"],
        responses={200: OrderSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        order = get_order_by_id(order_id=id, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateOrder",
        tags=["orders"],
        request=OrderUpdateSerializer,
        responses={200: OrderSerializer},
    )
    def put(self, request: Request, id: int) -> Response:
        serializer = OrderUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = update_order(
            order_id=id,
            user=request.user,
            lines_data=serializer.validated_data["lines"],
            discount_minor=serializer.validated_data["discount_minor"],
        )
        out_serializer = OrderSerializer(order)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class OrderCancelView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="cancelOrder",
        tags=["orders"],
        request=OrderCancelSerializer,
        responses={200: OrderSerializer},
    )
    def post(self, request: Request, id: int) -> Response:
        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = cancel_order(
            order_id=id,
            user=request.user,
            reason=serializer.validated_data["reason"],
        )
        out_serializer = OrderSerializer(order)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
