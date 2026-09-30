from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from apps.catalog.models import CatalogStatus, Item
from apps.orders.models import Order, OrderLine, OrderStatus, OrderType
from apps.shifts.models import Shift, ShiftStatus
from apps.tables.models import Table
from common.error_codes import ErrorCode
from common.exceptions import AppError


def create_order(
    *,
    user: Any,
    order_type: str,
    table_id: int | None = None,
    lines_data: list[dict[str, Any]],
    discount_minor: int = 0,
) -> Order:
    # 1. Role Check
    if user.role != "CASHIER":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    # 2. Validation Error (Type / Table pairing and line input ranges)
    if order_type == OrderType.DINE_IN and table_id is None:
        raise AppError(ErrorCode.VALIDATION_ERROR, details={"table_id": "Required for DINE_IN"})
    if order_type == OrderType.TAKEAWAY and table_id is not None:
        raise AppError(ErrorCode.VALIDATION_ERROR, details={"table_id": "Must be null for TAKEAWAY"})

    for line in lines_data:
        qty = line.get("qty")
        note = line.get("note", "")
        if qty is None or not isinstance(qty, int) or qty < 1 or qty > 999:
            raise AppError(ErrorCode.VALIDATION_ERROR, details={"qty": "Must be an integer between 1 and 999"})
        if len(note) > 140:
            raise AppError(ErrorCode.VALIDATION_ERROR, details={"note": "Max 140 characters"})

    with transaction.atomic():
        # 3. Caller OPEN shift
        shift = Shift.objects.select_for_update().filter(cashier=user, status=ShiftStatus.OPEN).first()
        if not shift:
            raise AppError(ErrorCode.NO_OPEN_SHIFT)

        # 4. Empty lines
        if not lines_data:
            raise AppError(ErrorCode.ORDER_EMPTY)

        # 5. Table check
        table_obj = None
        if table_id is not None:
            try:
                table_obj = Table.objects.select_for_update().get(pk=table_id)
            except Table.DoesNotExist as err:
                raise AppError(ErrorCode.NOT_FOUND) from err

        # 6. Item lookup
        item_ids = [line["item_id"] for line in lines_data]
        items_by_id = {
            item.id: item  # type: ignore[attr-defined]
            for item in Item.objects.select_related("category").filter(pk__in=item_ids)
        }
        for i_id in item_ids:
            if i_id not in items_by_id:
                raise AppError(ErrorCode.NOT_FOUND)

        # 7. ITEM_INACTIVE check
        inactive_ids = []
        for i_id in item_ids:
            item = items_by_id[i_id]
            if item.status != CatalogStatus.ACTIVE or item.category.status != CatalogStatus.ACTIVE:
                inactive_ids.append(i_id)
        if inactive_ids:
            raise AppError(ErrorCode.ITEM_INACTIVE, details={"item_ids": list(set(inactive_ids))})

        # 8. TABLE_INACTIVE
        if table_obj and not table_obj.is_active:
            raise AppError(ErrorCode.TABLE_INACTIVE)

        # 9. TABLE_OCCUPIED
        if table_obj and Order.objects.filter(table=table_obj, status=OrderStatus.OPEN).exists():
            raise AppError(ErrorCode.TABLE_OCCUPIED)

        # Merge lines with same item_id and same note
        merged_lines: dict[tuple[int, str], dict[str, Any]] = {}
        for line in lines_data:
            key = (line["item_id"], line.get("note", ""))
            if key in merged_lines:
                merged_lines[key]["qty"] += line["qty"]
            else:
                merged_lines[key] = {
                    "item_id": line["item_id"],
                    "qty": line["qty"],
                    "note": line.get("note", ""),
                }

        # Calculate Subtotal
        subtotal_minor = 0
        lines_to_create = []
        for (item_id, note), line_info in merged_lines.items():
            item = items_by_id[item_id]
            line_subtotal = item.price_minor * line_info["qty"]
            subtotal_minor += line_subtotal
            lines_to_create.append({
                "item": item,
                "item_name": item.name,
                "unit_price_minor": item.price_minor,
                "qty": line_info["qty"],
                "subtotal_minor": line_subtotal,
                "notes": note,
            })

        # 10. DISCOUNT_INVALID
        if discount_minor < 0 or discount_minor > subtotal_minor:
            raise AppError(ErrorCode.DISCOUNT_INVALID)

        total_minor = subtotal_minor - discount_minor

        # Sequence number
        max_num = Order.objects.aggregate(m=Max("number"))["m"]
        next_number = (max_num + 1) if max_num is not None and max_num >= 1000 else 1001

        try:
            order = Order.objects.create(
                number=next_number,
                type=order_type,
                status=OrderStatus.OPEN,
                table=table_obj,
                cashier=user,
                shift=shift,
                subtotal_minor=subtotal_minor,
                discount_minor=discount_minor,
                total_minor=total_minor,
            )
            for l_data in lines_to_create:
                OrderLine.objects.create(order=order, **l_data)
        except IntegrityError as err:
            # Under race condition on partial index
            if table_obj and Order.objects.filter(table=table_obj, status=OrderStatus.OPEN).exists():
                raise AppError(ErrorCode.TABLE_OCCUPIED) from err
            raise

    return order


def update_order(
    *,
    order_id: int,
    user: Any,
    lines_data: list[dict[str, Any]],
    discount_minor: int,
) -> Order:
    # 1. Role check
    if user.role != "CASHIER":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    with transaction.atomic():
        # 2. NOT_FOUND (path id)
        try:
            order = Order.objects.select_for_update(of=("self",)).select_related("cashier", "shift", "table").get(pk=order_id)
        except Order.DoesNotExist as err:
            raise AppError(ErrorCode.NOT_FOUND) from err

        # 3. NOT_ORDER_OWNER
        if order.cashier_id != user.id:  # type: ignore[attr-defined]
            raise AppError(ErrorCode.NOT_ORDER_OWNER)

        # 4. NO_OPEN_SHIFT
        shift = Shift.objects.select_for_update().filter(cashier=user, status=ShiftStatus.OPEN).first()
        if not shift:
            raise AppError(ErrorCode.NO_OPEN_SHIFT)

        # 5. ORDER_NOT_EDITABLE
        if order.status != OrderStatus.OPEN:
            raise AppError(ErrorCode.ORDER_NOT_EDITABLE)

        # 6. ORDER_EMPTY
        if not lines_data:
            raise AppError(ErrorCode.ORDER_EMPTY)

        # 7. Body validation & Existing lines check
        existing_lines = {line_obj.id: line_obj for line_obj in order.lines.all()}  # type: ignore[attr-defined]
        for line in lines_data:
            l_id = line.get("id")
            if l_id is not None:
                if l_id not in existing_lines:
                    raise AppError(
                        ErrorCode.VALIDATION_ERROR,
                        details={"lines": f"Line {l_id} does not belong to order"},
                    )
                if line["item_id"] != existing_lines[l_id].item_id:
                    raise AppError(
                        ErrorCode.VALIDATION_ERROR,
                        details={"lines": f"Cannot change item_id for line {l_id}"},
                    )
            qty = line.get("qty")
            note = line.get("note", "")
            if qty is None or not isinstance(qty, int) or qty < 1 or qty > 999:
                raise AppError(ErrorCode.VALIDATION_ERROR, details={"qty": "Must be 1..999"})
            if len(note) > 140:
                raise AppError(ErrorCode.VALIDATION_ERROR, details={"note": "Max 140 characters"})

        # 8. NOT_FOUND (item_ids for new lines)
        item_ids = [line["item_id"] for line in lines_data]
        items_by_id = {
            item.id: item  # type: ignore[attr-defined]
            for item in Item.objects.select_related("category").filter(pk__in=item_ids)
        }
        for line in lines_data:
            if line.get("id") is None and line["item_id"] not in items_by_id:
                raise AppError(ErrorCode.NOT_FOUND)

        # 9. ITEM_INACTIVE check
        inactive_ids = []
        for line in lines_data:
            l_id = line.get("id")
            i_id = line["item_id"]
            if l_id is None:
                # New line
                item = items_by_id[i_id]
                if item.status != CatalogStatus.ACTIVE or item.category.status != CatalogStatus.ACTIVE:
                    inactive_ids.append(i_id)
            else:
                # Existing line: if raising quantity on inactive item
                existing_line = existing_lines[l_id]
                item = items_by_id.get(i_id) or existing_line.item
                is_item_inactive = (
                    item.status != CatalogStatus.ACTIVE or item.category.status != CatalogStatus.ACTIVE
                )
                if is_item_inactive and line["qty"] > existing_line.qty:
                    inactive_ids.append(i_id)

        if inactive_ids:
            raise AppError(ErrorCode.ITEM_INACTIVE, details={"item_ids": list(set(inactive_ids))})

        # Process lines update:
        payload_line_ids = {line["id"] for line in lines_data if line.get("id") is not None}
        for existing_id, existing_line in list(existing_lines.items()):
            if existing_id not in payload_line_ids:
                existing_line.delete()

        subtotal_minor = 0
        for line in lines_data:
            l_id = line.get("id")
            note = line.get("note", "")
            qty = line["qty"]

            if l_id is not None:
                el = existing_lines[l_id]
                el.qty = qty
                el.notes = note
                el.subtotal_minor = el.unit_price_minor * qty
                el.save()
                subtotal_minor += el.subtotal_minor
            else:
                item = items_by_id[line["item_id"]]
                unit_price = item.price_minor
                line_subtotal = unit_price * qty
                OrderLine.objects.create(
                    order=order,
                    item=item,
                    item_name=item.name,
                    unit_price_minor=unit_price,
                    qty=qty,
                    subtotal_minor=line_subtotal,
                    notes=note,
                )
                subtotal_minor += line_subtotal

        # 10. DISCOUNT_INVALID
        if discount_minor < 0 or discount_minor > subtotal_minor:
            raise AppError(ErrorCode.DISCOUNT_INVALID)

        order.subtotal_minor = subtotal_minor
        order.discount_minor = discount_minor
        order.total_minor = subtotal_minor - discount_minor
        order.save()

    return order


def cancel_order(*, order_id: int, user: Any, reason: str) -> Order:
    # 1. Role check
    if user.role != "CASHIER":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    # 2. Reason validation (length 3..200)
    trimmed_reason = (reason or "").strip()
    if len(trimmed_reason) < 3 or len(trimmed_reason) > 200:
        raise AppError(ErrorCode.VALIDATION_ERROR, details={"reason": "Reason must be between 3 and 200 characters"})

    with transaction.atomic():
        # 3. NOT_FOUND
        try:
            order = Order.objects.select_for_update(of=("self",)).select_related("cashier", "shift").get(pk=order_id)
        except Order.DoesNotExist as err:
            raise AppError(ErrorCode.NOT_FOUND) from err

        # 4. NOT_ORDER_OWNER
        if order.cashier_id != user.id:  # type: ignore[attr-defined]
            raise AppError(ErrorCode.NOT_ORDER_OWNER)

        # 5. NO_OPEN_SHIFT
        shift = Shift.objects.select_for_update().filter(cashier=user, status=ShiftStatus.OPEN).first()
        if not shift:
            raise AppError(ErrorCode.NO_OPEN_SHIFT)

        # 6. ORDER_NOT_EDITABLE
        if order.status != OrderStatus.OPEN:
            raise AppError(ErrorCode.ORDER_NOT_EDITABLE)

        order.status = OrderStatus.CANCELLED
        order.cancelled_at = timezone.now()
        order.cancel_reason = trimmed_reason
        order.save()

    return order
