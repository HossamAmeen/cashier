from common.error_codes import ErrorCode
from common.exceptions import AppError

from apps.orders.models import Order, OrderStatus
from .models import Table


def _annotate_table(table: Table) -> Table:
    open_order = (
        Order.objects.filter(table=table, status=OrderStatus.OPEN)
        .select_related("cashier")
        .prefetch_related("lines")
        .first()
    )
    if open_order:
        table.status = "OCCUPIED"  # type: ignore[attr-defined]
        table.current_order = {  # type: ignore[attr-defined]
            "id": open_order.id,  # type: ignore[attr-defined]
            "number": open_order.number,
            "item_count": sum(line.qty for line in open_order.lines.all()),  # type: ignore[attr-defined]
            "total_minor": open_order.total_minor,
            "cashier_id": open_order.cashier.id,  # type: ignore[attr-defined]
            "cashier_name": open_order.cashier.name,
            "created_at": open_order.created_at.isoformat(),
        }
    else:
        table.status = "AVAILABLE"  # type: ignore[attr-defined]
        table.current_order = None  # type: ignore[attr-defined]
    return table


def list_tables(
    user_role: str,
    is_active: bool | None = None,
    status_filter: str | None = None,
) -> list[Table]:
    qs = Table.objects.all().order_by("number")

    if user_role == "CASHIER":
        qs = qs.filter(is_active=True)
    elif is_active is not None:
        qs = qs.filter(is_active=is_active)

    tables = list(qs)
    annotated: list[Table] = []
    for t in tables:
        _annotate_table(t)
        st = getattr(t, "status", "AVAILABLE")
        if status_filter is None or st == status_filter:
            annotated.append(t)

    return annotated


def get_table_counts(user_role: str) -> dict[str, int]:
    qs = Table.objects.all()
    if user_role == "CASHIER":
        qs = qs.filter(is_active=True)

    tables = list(qs)
    all_count = len(tables)

    open_table_ids = set(
        Order.objects.filter(status=OrderStatus.OPEN, table__isnull=False).values_list("table_id", flat=True)
    )

    occupied_count = sum(1 for t in tables if getattr(t, "id", None) in open_table_ids)
    available_count = all_count - occupied_count

    return {
        "all": all_count,
        "available": available_count,
        "occupied": occupied_count,
    }


def get_table_by_id(table_id: int, user_role: str) -> Table:
    try:
        table = Table.objects.get(id=table_id)
    except Table.DoesNotExist as err:
        raise AppError(ErrorCode.NOT_FOUND) from err

    if user_role == "CASHIER" and not table.is_active:
        raise AppError(ErrorCode.NOT_FOUND) from None

    return _annotate_table(table)


def get_table_occupancy() -> dict[str, int]:
    from django.db.models import Sum

    active_tables = Table.objects.filter(is_active=True)
    total_active = active_tables.count()

    open_table_orders = Order.objects.filter(
        status=OrderStatus.OPEN, table__isnull=False, table__is_active=True
    )
    occupied_count = open_table_orders.values("table_id").distinct().count()
    available_count = max(0, total_active - occupied_count)
    occupied_total_minor = (
        open_table_orders.aggregate(total=Sum("total_minor"))["total"] or 0
    )

    return {
        "total_active": total_active,
        "available": available_count,
        "occupied": occupied_count,
        "occupied_total_minor": occupied_total_minor,
    }
