from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from apps.payments.models import PaymentMethod
from apps.users.models import User
from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import Shift, ShiftStatus
from .selectors import _annotate_shift, has_open_shift


def open_shift(user: User, opening_balance_minor: int) -> Shift:
    if user.role == "ADMIN":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    if has_open_shift(user.id):
        raise AppError(ErrorCode.SHIFT_ALREADY_OPEN)

    try:
        shift = Shift.objects.create(
            cashier=user,
            opening_balance_minor=opening_balance_minor,
            status=ShiftStatus.OPEN,
        )
        return _annotate_shift(shift)
    except IntegrityError as err:
        raise AppError(ErrorCode.SHIFT_ALREADY_OPEN) from err


@transaction.atomic
def close_shift(user: User, shift_id: int, counted_cash_minor: int) -> Shift:
    if user.role == "ADMIN":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    try:
        shift = Shift.objects.select_for_update().get(id=shift_id)
    except Shift.DoesNotExist:
        raise AppError(ErrorCode.NOT_FOUND)

    if shift.cashier_id != user.id:
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    if shift.status != ShiftStatus.OPEN:
        raise AppError(ErrorCode.NO_OPEN_SHIFT)

    open_orders_qs = Order.objects.filter(shift=shift, status=OrderStatus.OPEN)
    if open_orders_qs.exists():
        open_order_numbers = list(open_orders_qs.values_list("number", flat=True))
        raise AppError(
            ErrorCode.SHIFT_HAS_OPEN_ORDERS,
            details={"open_order_numbers": open_order_numbers},
        )

    paid_orders = Order.objects.filter(shift=shift, status=OrderStatus.PAID)
    orders_count = paid_orders.count()
    sales_total_minor = (
        paid_orders.aggregate(total=Sum("total_minor"))["total"] or 0
    )
    cash_total_minor = (
        paid_orders.filter(payment__method=PaymentMethod.CASH).aggregate(
            total=Sum("total_minor")
        )["total"]
        or 0
    )
    card_total_minor = (
        paid_orders.filter(payment__method=PaymentMethod.CARD).aggregate(
            total=Sum("total_minor")
        )["total"]
        or 0
    )

    expected_cash_minor = shift.opening_balance_minor + cash_total_minor
    difference_minor = counted_cash_minor - expected_cash_minor

    shift.status = ShiftStatus.CLOSED
    shift.closed_at = timezone.now()
    shift.sales_total_minor_snapshot = sales_total_minor
    shift.cash_total_minor_snapshot = cash_total_minor
    shift.card_total_minor_snapshot = card_total_minor
    shift.orders_count_snapshot = orders_count
    shift.counted_cash_minor = counted_cash_minor
    shift.difference_minor = difference_minor
    shift.save()

    return _annotate_shift(shift)
