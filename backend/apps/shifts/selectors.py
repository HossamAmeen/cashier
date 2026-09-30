from django.db.models import QuerySet, Sum

from apps.orders.models import Order, OrderStatus
from apps.payments.models import PaymentMethod
from apps.users.models import User
from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import Shift, ShiftStatus


def has_open_shift(user_id: int) -> bool:
    return Shift.objects.filter(cashier_id=user_id, status=ShiftStatus.OPEN).exists()


def _annotate_shift(shift: Shift) -> Shift:
    if shift.status == ShiftStatus.OPEN:
        open_orders_qs = Order.objects.filter(shift=shift, status=OrderStatus.OPEN)
        open_orders_count = open_orders_qs.count()
        open_order_numbers = list(open_orders_qs.values_list("number", flat=True))

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

        setattr(shift, "sales_total_minor", sales_total_minor)
        setattr(shift, "cash_total_minor", cash_total_minor)
        setattr(shift, "card_total_minor", card_total_minor)
        setattr(shift, "orders_count", orders_count)
        setattr(shift, "open_orders_count", open_orders_count)
        setattr(shift, "open_order_numbers", open_order_numbers)
        setattr(shift, "expected_cash_minor", expected_cash_minor)
        setattr(shift, "counted_cash_minor", None)
        setattr(shift, "difference_minor", None)
    else:
        sales_total_minor = shift.sales_total_minor_snapshot or 0
        cash_total_minor = shift.cash_total_minor_snapshot or 0
        card_total_minor = shift.card_total_minor_snapshot or 0
        orders_count = shift.orders_count_snapshot or 0
        expected_cash_minor = shift.opening_balance_minor + cash_total_minor

        setattr(shift, "sales_total_minor", sales_total_minor)
        setattr(shift, "cash_total_minor", cash_total_minor)
        setattr(shift, "card_total_minor", card_total_minor)
        setattr(shift, "orders_count", orders_count)
        setattr(shift, "open_orders_count", 0)
        setattr(shift, "open_order_numbers", [])
        setattr(shift, "expected_cash_minor", expected_cash_minor)
        setattr(shift, "counted_cash_minor", shift.counted_cash_minor)
        setattr(shift, "difference_minor", shift.difference_minor)

    return shift


def get_current_shift(user: User) -> Shift | None:
    try:
        shift = Shift.objects.select_related("cashier").get(
            cashier=user, status=ShiftStatus.OPEN
        )
        return _annotate_shift(shift)
    except Shift.DoesNotExist:
        return None


def get_shift_by_id(shift_id: int, user: User) -> Shift:
    try:
        shift = Shift.objects.select_related("cashier").get(id=shift_id)
    except Shift.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err

    if user.role == "CASHIER" and shift.cashier_id != user.id:
        raise AppError(ErrorCode.FORBIDDEN_ROLE) from None

    return _annotate_shift(shift)


def list_shifts(
    user: User,
    cashier_id: int | None = None,
    status_filter: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> QuerySet[Shift]:
    qs = Shift.objects.select_related("cashier").order_by("-opened_at")

    if user.role == "CASHIER":
        if cashier_id is not None and cashier_id != user.id:
            raise AppError(ErrorCode.FORBIDDEN_ROLE)
        qs = qs.filter(cashier=user)
    elif cashier_id is not None:
        qs = qs.filter(cashier_id=cashier_id)

    if status_filter:
        qs = qs.filter(status=status_filter)

    if date_from:
        qs = qs.filter(opened_at__gte=date_from)
    if date_to:
        qs = qs.filter(opened_at__lte=date_to)

    shifts = list(qs)
    for s in shifts:
        _annotate_shift(s)

    return qs
