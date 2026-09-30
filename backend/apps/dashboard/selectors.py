import zoneinfo
from datetime import datetime, time
from typing import Any

from django.db.models import Sum
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from apps.shifts.models import Shift, ShiftStatus
from apps.shifts.selectors import get_current_shift
from apps.tables.selectors import get_table_occupancy
from apps.users.models import Role, User, UserStatus
from common.error_codes import ErrorCode
from common.exceptions import AppError

CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")


def get_cashier_dashboard(user: User) -> dict[str, Any]:
    if user.role == "ADMIN":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    shift = get_current_shift(user)
    tables = get_table_occupancy()
    running_orders = Order.objects.filter(
        cashier=user, status=OrderStatus.OPEN
    ).order_by("-number")

    return {
        "shift": shift,
        "tables": tables,
        "running_orders": running_orders,
    }


def get_admin_dashboard(user: User) -> dict[str, Any]:
    if user.role == "CASHIER":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    now_cairo = timezone.now().astimezone(CAIRO_TZ)
    business_date = now_cairo.date().isoformat()
    start_of_day = datetime.combine(now_cairo.date(), time.min, tzinfo=CAIRO_TZ)

    paid_orders_today_qs = Order.objects.filter(
        status=OrderStatus.PAID, payment__paid_at__gte=start_of_day
    )
    sales_today_minor = (
        paid_orders_today_qs.aggregate(total=Sum("total_minor"))["total"] or 0
    )
    paid_orders_today = paid_orders_today_qs.count()

    orders_today_qs = Order.objects.filter(created_at__gte=start_of_day)
    orders_today = {
        "total": orders_today_qs.count(),
        "open": orders_today_qs.filter(status=OrderStatus.OPEN).count(),
        "paid": orders_today_qs.filter(status=OrderStatus.PAID).count(),
        "cancelled": orders_today_qs.filter(status=OrderStatus.CANCELLED).count(),
    }

    open_shifts_qs = Shift.objects.filter(status=ShiftStatus.OPEN).select_related("cashier")
    open_shifts_list = []
    open_cashier_ids = set()

    for s in open_shifts_qs:
        open_cashier_ids.add(s.cashier_id)
        live_sales = (
            Order.objects.filter(shift=s, status=OrderStatus.PAID).aggregate(
                total=Sum("total_minor")
            )["total"]
            or 0
        )
        open_shifts_list.append(
            {
                "shift_id": s.id,
                "code": s.code,
                "cashier_id": s.cashier_id,
                "cashier_name": s.cashier.name,
                "opened_at": s.opened_at,
                "sales_total_minor": live_sales,
            }
        )

    open_shifts = {
        "count": len(open_shifts_list),
        "items": open_shifts_list,
    }

    tables = get_table_occupancy()

    total_active_cashiers = User.objects.filter(
        role=Role.CASHIER, status=UserStatus.ACTIVE
    ).count()
    with_open_shift = len(open_cashier_ids)
    without_open_shift = max(0, total_active_cashiers - with_open_shift)

    cashiers = {
        "total_active": total_active_cashiers,
        "with_open_shift": with_open_shift,
        "without_open_shift": without_open_shift,
    }

    recent_orders = (
        Order.objects.select_related("cashier", "table", "shift", "payment")
        .prefetch_related("lines")
        .order_by("-created_at")[:3]
    )

    return {
        "business_date": business_date,
        "sales_today_minor": sales_today_minor,
        "paid_orders_today": paid_orders_today,
        "orders_today": orders_today,
        "open_shifts": open_shifts,
        "tables": tables,
        "cashiers": cashiers,
        "recent_orders": recent_orders,
    }
