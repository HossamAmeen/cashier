from django.db.models import Count, Prefetch, Q, QuerySet, Value

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import CatalogStatus, Category, Item


def list_categories(status: str | None = None) -> QuerySet[Category]:
    qs = Category.objects.annotate(item_count=Count("items"))
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("sort_order", "name")


def get_category_by_id(category_id: int) -> Category:
    try:
        return Category.objects.annotate(item_count=Count("items")).get(id=category_id)
    except Category.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err


def list_items(
    category_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
) -> QuerySet[Item]:
    qs = Item.objects.select_related("category").annotate(in_use=Value(False))
    if category_id is not None:
        qs = qs.filter(category_id=category_id)
    if status:
        qs = qs.filter(status=status)
    if search:
        s = search.strip()
        qs = qs.filter(Q(name__icontains=s) | Q(description__icontains=s))
    return qs.order_by("category__sort_order", "category__name", "name")


def get_item_by_id(item_id: int) -> Item:
    try:
        return Item.objects.select_related("category").annotate(in_use=Value(False)).get(id=item_id)
    except Item.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err


def get_active_catalog() -> QuerySet[Category]:
    active_items_prefetch = Prefetch(
        "items",
        queryset=Item.objects.filter(status=CatalogStatus.ACTIVE).order_by("name"),
    )
    return Category.objects.filter(status=CatalogStatus.ACTIVE).prefetch_related(
        active_items_prefetch
    ).order_by("sort_order", "name")
