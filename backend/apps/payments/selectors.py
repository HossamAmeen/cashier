from typing import Any

from apps.orders.models import OrderStatus
from apps.orders.selectors import get_order_by_id
from apps.store_settings.models import Settings
from common.error_codes import ErrorCode
from common.exceptions import AppError


def get_receipt(*, order_id: int, user: Any) -> dict[str, Any]:
    order = get_order_by_id(order_id=order_id, user=user)

    if order.status != OrderStatus.PAID or not hasattr(order, "payment") or not order.payment:
        raise AppError(ErrorCode.NOT_FOUND)

    settings = Settings.get_solo()
    payment = order.payment

    lines = [
        {
            "name": line.item_name,
            "qty": line.qty,
            "line_total_minor": line.subtotal_minor,
        }
        for line in order.lines.all()
    ]

    is_cash = payment.method == "CASH"

    return {
        "business_name": settings.business_name,
        "order_number": order.number,
        "order_type": order.type,
        "table_number": order.table.number if order.table else None,
        "paid_at": payment.paid_at.isoformat(),
        "cashier_name": order.cashier.name,
        "lines": lines,
        "subtotal_minor": order.subtotal_minor,
        "discount_minor": order.discount_minor,
        "total_minor": order.total_minor,
        "payment_method": payment.method,
        "amount_received_minor": payment.amount_received_minor if is_cash else None,
        "change_minor": payment.change_minor if is_cash else None,
        "receipt_footer": settings.receipt_footer,
    }
