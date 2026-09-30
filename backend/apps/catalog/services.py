from typing import Any

from django.db import IntegrityError

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import Category, Item
from .selectors import get_category_by_id


def create_category(data: dict[str, Any]) -> Category:
    try:
        category = Category.objects.create(**data)
        return get_category_by_id(category.id)
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err


def update_category(category: Category, data: dict[str, Any]) -> Category:
    try:
        for attr, value in data.items():
            setattr(category, attr, value)
        category.save()
        return get_category_by_id(category.id)
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err


def delete_category(category: Category) -> None:
    if category.items.exists():
        raise AppError(ErrorCode.CATEGORY_NOT_EMPTY)
    category.delete()


def create_item(data: dict[str, Any]) -> Item:
    category_id = data.pop("category_id")
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err

    try:
        item = Item.objects.create(category=category, **data)
        item.in_use = False  # type: ignore[attr-defined]
        return item
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err


def update_item(item: Item, data: dict[str, Any]) -> Item:
    if "category_id" in data:
        category_id = data.pop("category_id")
        try:
            item.category = Category.objects.get(id=category_id)
        except Category.DoesNotExist as err:
            raise AppError(ErrorCode.NOT_FOUND) from err

    try:
        for attr, value in data.items():
            setattr(item, attr, value)
        item.save()
        item.in_use = False  # type: ignore[attr-defined]
        return item
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err


def delete_item(item: Item) -> None:
    from apps.orders.models import OrderLine
    if OrderLine.objects.filter(item=item).exists():
        raise AppError(ErrorCode.ITEM_IN_USE)
    item.delete()
