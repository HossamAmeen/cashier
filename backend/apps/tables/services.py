from typing import Any

from django.db import IntegrityError

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import Table
from .selectors import get_table_by_id


def create_table(data: dict[str, Any], user_role: str) -> Table:
    try:
        table = Table.objects.create(**data)
        return get_table_by_id(table.id, user_role)
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err


def update_table(table: Table, data: dict[str, Any], user_role: str) -> Table:
    from apps.orders.models import Order, OrderStatus

    is_occupied = Order.objects.filter(table=table, status=OrderStatus.OPEN).exists()
    if is_occupied:
        if "number" in data and data["number"] != table.number:
            raise AppError(ErrorCode.TABLE_OCCUPIED)
        if "is_active" in data and not data["is_active"] and table.is_active:
            raise AppError(ErrorCode.TABLE_OCCUPIED)

    try:
        for attr, value in data.items():
            setattr(table, attr, value)
        table.save()
        return get_table_by_id(table.id, user_role)
    except IntegrityError as err:
        raise AppError(ErrorCode.DUPLICATE_VALUE) from err
