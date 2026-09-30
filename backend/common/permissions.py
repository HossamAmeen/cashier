"""Role permissions (BR-ROLE-01..05). A failed check → 403 FORBIDDEN_ROLE via the central handler.

Roles are read from ``request.user.role`` ("ADMIN" | "CASHIER"), defined by the users app in slice 1.
"""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

ADMIN = "ADMIN"
CASHIER = "CASHIER"


def _role(request: Request) -> str | None:
    user = request.user
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "role", None)


class IsAdmin(BasePermission):
    """BR-ROLE-01: ADMIN-only operations."""

    def has_permission(self, request: Request, view: Any) -> bool:
        return _role(request) == ADMIN


class IsCashier(BasePermission):
    """BR-ROLE-02/03: CASHIER-only operations (open shift, orders, payments)."""

    def has_permission(self, request: Request, view: Any) -> bool:
        return _role(request) == CASHIER


class IsAdminOrCashier(BasePermission):
    def has_permission(self, request: Request, view: Any) -> bool:
        return _role(request) in (ADMIN, CASHIER)
