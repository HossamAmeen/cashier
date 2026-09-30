import zoneinfo
from datetime import datetime, time
from typing import Any

from django.db.models import QuerySet
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from apps.shifts.models import Shift
from common.error_codes import ErrorCode
from common.exceptions import AppError

CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")


def list_orders(
    *,
    user: Any,
    cashier_id: int | None = None,
    payment_method: str | None = None,
    status: str | None = None,
    shift_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
) -> QuerySet[Order]:
    qs = Order.objects.select_related("cashier", "table", "shift", "payment").prefetch_related("lines")

    if user.role == "CASHIER":
        if cashier_id is not None and cashier_id != user.id:
            raise AppError(ErrorCode.FORBIDDEN_ROLE)
        if shift_id is not None:
            try:
                shift_obj = Shift.objects.get(pk=shift_id)
                if shift_obj.cashier_id != user.id:  # type: ignore[attr-defined]
                    raise AppError(ErrorCode.FORBIDDEN_ROLE)
            except Shift.DoesNotExist as err:
                raise AppError(ErrorCode.FORBIDDEN_ROLE) from err
        qs = qs.filter(cashier=user)
    else:
        if cashier_id is not None:
            qs = qs.filter(cashier_id=cashier_id)

    if shift_id is not None:
        qs = qs.filter(shift_id=shift_id)

    if status is not None:
        qs = qs.filter(status=status)

    if payment_method is not None:
        qs = qs.filter(payment__method=payment_method, status=OrderStatus.PAID)

    if search:
        clean_search = search.strip().lstrip("#")
        if clean_search.isdigit():
            qs = qs.filter(number=int(clean_search))

    if date_from:
        try:
            d_from = datetime.strptime(date_from, "%Y-%m-%d").date()
            dt_from = datetime.combine(d_from, time.min, tzinfo=CAIRO_TZ)
            qs = qs.filter(created_at__gte=dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            d_to = datetime.strptime(date_to, "%Y-%m-%d").date()
            dt_to = datetime.combine(d_to, time.max, tzinfo=CAIRO_TZ)
            qs = qs.filter(created_at__lte=dt_to)
        except ValueError:
            pass

    return qs.order_by("-number")


def get_order_by_id(*, order_id: int, user: Any) -> Order:
    try:
        order = (
            Order.objects.select_related("cashier", "table", "shift", "payment")
            .prefetch_related("lines")
            .get(pk=order_id)
        )
    except Order.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err

    if user.role == "CASHIER":
        if order.cashier_id != user.id:  # type: ignore[attr-defined]
            if not (order.status == OrderStatus.OPEN and order.type == "DINE_IN"):
                raise AppError(ErrorCode.FORBIDDEN_ROLE)

    return order


def get_today_counts(*, user: Any) -> dict[str, int]:
    now_cairo = timezone.now().astimezone(CAIRO_TZ)
    start_of_day = datetime.combine(now_cairo.date(), time.min, tzinfo=CAIRO_TZ)

    qs = Order.objects.filter(created_at__gte=start_of_day)
    if user.role == "CASHIER":
        qs = qs.filter(cashier=user)

    total = qs.count()
    paid = qs.filter(status=OrderStatus.PAID).count()
    open_cnt = qs.filter(status=OrderStatus.OPEN).count()
    cancelled = qs.filter(status=OrderStatus.CANCELLED).count()

    return {
        "total": total,
        "paid": paid,
        "open": open_cnt,
        "cancelled": cancelled,
    }
