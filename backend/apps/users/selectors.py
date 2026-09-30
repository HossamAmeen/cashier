"""User selectors for reads, counts, and shift checks (T02-BE-01, T02-BE-02)."""

from typing import Any

from django.db.models import Q

from .models import Role, User, UserStatus


from apps.shifts.selectors import has_open_shift as shift_has_open_shift


def has_open_shift(user: User) -> bool:
    """Checks if the user has an active OPEN shift (BR-USR-03, BR-USR-05)."""
    return shift_has_open_shift(user.id)


def count_active_admins() -> int:
    return User.objects.filter(role=Role.ADMIN, status=UserStatus.ACTIVE).count()


def get_user_counts() -> dict[str, int]:
    qs = User.objects.all()
    return {
        "all": qs.count(),
        "admin": qs.filter(role=Role.ADMIN).count(),
        "cashier": qs.filter(role=Role.CASHIER).count(),
    }


def get_cashier_counts() -> dict[str, int]:
    qs = User.objects.filter(role=Role.CASHIER)
    return {
        "all": qs.count(),
        "active": qs.filter(status=UserStatus.ACTIVE).count(),
        "disabled": qs.filter(status=UserStatus.DISABLED).count(),
    }


def filter_users(
    *,
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> Any:
    qs = User.objects.all()
    if role:
        qs = qs.filter(role=role)
    if status:
        qs = qs.filter(status=status)
    if search:
        s = search.strip()
        qs = qs.filter(Q(name__icontains=s) | Q(username__icontains=s))
    return qs.order_by("-created_at", "-id")


def filter_cashiers(
    *,
    status: str | None = None,
    search: str | None = None,
) -> Any:
    qs = User.objects.filter(role=Role.CASHIER)
    if status:
        qs = qs.filter(status=status)
    if search:
        s = search.strip()
        qs = qs.filter(Q(name__icontains=s) | Q(username__icontains=s))
    return qs.order_by("-created_at", "-id")
