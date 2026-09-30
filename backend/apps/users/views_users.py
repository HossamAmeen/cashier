"""User and Cashier views matching docs/api/openapi.yaml."""

from typing import Any

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.error_codes import ErrorCode
from common.exceptions import AppError
from common.pagination import StandardPagination
from common.permissions import IsAdmin

from .models import Role, User
from .selectors import filter_cashiers, filter_users, get_cashier_counts, get_user_counts
from .serializers import (
    CashierDetailSerializer,
    CashierListItemSerializer,
    CashierPageSerializer,
    UserCreateSerializer,
    UserPageSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .services_users import create_user, update_user


class UserListCreateView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="listUsers",
        tags=["users"],
        parameters=[
            OpenApiParameter(name="role", type=str, required=False),
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses={200: UserPageSerializer},
    )
    def get(self, request: Request) -> Response:
        role = request.query_params.get("role")
        user_status = request.query_params.get("status")
        search = request.query_params.get("search")

        qs = filter_users(role=role, status=user_status, search=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = UserSerializer(page, many=True)
        resp_data = paginator.get_paginated_data(serializer.data)
        resp_data["counts"] = get_user_counts()
        return Response(resp_data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="createUser",
        tags=["users"],
        request=UserCreateSerializer,
        responses={201: UserSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data: dict[str, Any] = serializer.validated_data

        user = create_user(
            name=data["name"],
            username=data["username"],
            password=data["password"],
            role=data["role"],
            status=data.get("status", "ACTIVE"),
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="getUser",
        tags=["users"],
        responses={200: UserSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        user = User.objects.filter(pk=id).first()
        if user is None:
            raise AppError(ErrorCode.NOT_FOUND)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateUser",
        tags=["users"],
        request=UserUpdateSerializer,
        responses={200: UserSerializer},
    )
    def patch(self, request: Request, id: int) -> Response:
        serializer = UserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data: dict[str, Any] = serializer.validated_data

        user = update_user(id, **data)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class CashierListView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="listCashiers",
        tags=["cashiers"],
        parameters=[
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses={200: CashierPageSerializer},
    )
    def get(self, request: Request) -> Response:
        user_status = request.query_params.get("status")
        search = request.query_params.get("search")

        qs = filter_cashiers(status=user_status, search=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = CashierListItemSerializer(page, many=True)
        resp_data = paginator.get_paginated_data(serializer.data)
        resp_data["counts"] = get_cashier_counts()
        return Response(resp_data, status=status.HTTP_200_OK)


class CashierDetailView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="getCashier",
        tags=["cashiers"],
        responses={200: CashierDetailSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        user = User.objects.filter(pk=id, role=Role.CASHIER).first()
        if user is None:
            raise AppError(ErrorCode.NOT_FOUND)
        return Response(CashierDetailSerializer(user).data, status=status.HTTP_200_OK)
