from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsAdmin

from .selectors import (
    get_active_catalog,
    get_category_by_id,
    get_item_by_id,
    list_categories,
    list_items,
)
from .serializers import (
    CatalogCategorySerializer,
    CatalogSerializer,
    CategoryCreateSerializer,
    CategorySerializer,
    CategoryUpdateSerializer,
    ItemCreateSerializer,
    ItemSerializer,
    ItemUpdateSerializer,
)
from .services import (
    create_category,
    create_item,
    delete_category,
    delete_item,
    update_category,
    update_item,
)


class CategoryListCreateView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="listCategories",
        tags=["catalog"],
        parameters=[
            OpenApiParameter(name="status", type=str, required=False),
        ],
        responses={200: CategorySerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        cat_status = request.query_params.get("status")
        qs = list_categories(status=cat_status)
        serializer = CategorySerializer(qs, many=True)
        return Response({"items": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="createCategory",
        tags=["catalog"],
        request=CategoryCreateSerializer,
        responses={201: CategorySerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = CategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = create_category(serializer.validated_data)
        out_serializer = CategorySerializer(category)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="getCategory",
        tags=["catalog"],
        responses={200: CategorySerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        category = get_category_by_id(id)
        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateCategory",
        tags=["catalog"],
        request=CategoryUpdateSerializer,
        responses={200: CategorySerializer},
    )
    def patch(self, request: Request, id: int) -> Response:
        category = get_category_by_id(id)
        serializer = CategoryUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_category(category, serializer.validated_data)
        out_serializer = CategorySerializer(updated)
        return Response(out_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="deleteCategory",
        tags=["catalog"],
        responses={204: None},
    )
    def delete(self, request: Request, id: int) -> Response:
        category = get_category_by_id(id)
        delete_category(category)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ItemListCreateView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="listItems",
        tags=["catalog"],
        parameters=[
            OpenApiParameter(name="category_id", type=int, required=False),
            OpenApiParameter(name="status", type=str, required=False),
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses={200: ItemSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        category_id_param = request.query_params.get("category_id")
        category_id = int(category_id_param) if category_id_param else None
        item_status = request.query_params.get("status")
        search = request.query_params.get("search")

        qs = list_items(category_id=category_id, status=item_status, search=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = ItemSerializer(page, many=True)
        resp_data = paginator.get_paginated_data(serializer.data)
        return Response(resp_data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="createItem",
        tags=["catalog"],
        request=ItemCreateSerializer,
        responses={201: ItemSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = ItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_item(serializer.validated_data)
        out_serializer = ItemSerializer(item)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class ItemDetailView(APIView):
    permission_classes = (IsAdmin,)

    @extend_schema(
        operation_id="getItem",
        tags=["catalog"],
        responses={200: ItemSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        item = get_item_by_id(id)
        serializer = ItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateItem",
        tags=["catalog"],
        request=ItemUpdateSerializer,
        responses={200: ItemSerializer},
    )
    def patch(self, request: Request, id: int) -> Response:
        item = get_item_by_id(id)
        serializer = ItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_item(item, serializer.validated_data)
        out_serializer = ItemSerializer(updated)
        return Response(out_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="deleteItem",
        tags=["catalog"],
        responses={204: None},
    )
    def delete(self, request: Request, id: int) -> Response:
        item = get_item_by_id(id)
        delete_item(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CatalogView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getCatalog",
        tags=["catalog"],
        responses={200: CatalogSerializer},
    )
    def get(self, request: Request) -> Response:
        categories = get_active_catalog()
        categories_data = CatalogCategorySerializer(categories, many=True).data
        return Response({"categories": categories_data}, status=status.HTTP_200_OK)
