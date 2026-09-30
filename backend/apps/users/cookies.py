"""Refresh cookie and the CSRF guard for cookie-authenticated endpoints (ADR-0003, OQ-6)."""

from typing import Any

from django.conf import settings
from django.http import HttpResponseBase
from rest_framework.request import Request

from common.error_codes import ErrorCode
from common.exceptions import AppError

EXPIRED = "Thu, 01 Jan 1970 00:00:00 GMT"


def _cfg() -> dict[str, Any]:
    cfg: dict[str, Any] = settings.REFRESH_COOKIE
    return cfg


def read_refresh_cookie(request: Request) -> str | None:
    value = request.COOKIES.get(_cfg()["NAME"])
    return str(value) if value else None


def set_refresh_cookie(response: HttpResponseBase, token: str, *, remember: bool) -> None:
    """Host-only (no Domain), HttpOnly, Secure, SameSite=Strict, Path=/api/auth/.

    OQ-6: remember → persistent for 7 days; otherwise a session cookie (no Max-Age/Expires).
    """
    cfg = _cfg()
    response.set_cookie(
        cfg["NAME"],
        token,
        max_age=cfg["REMEMBER_MAX_AGE"] if remember else None,
        path=cfg["PATH"],
        domain=cfg["DOMAIN"],
        secure=cfg["SECURE"],
        httponly=cfg["HTTPONLY"],
        samesite=cfg["SAMESITE"],
    )


def clear_refresh_cookie(response: HttpResponseBase) -> None:
    cfg = _cfg()
    response.set_cookie(
        cfg["NAME"],
        "",
        max_age=0,
        expires=EXPIRED,
        path=cfg["PATH"],
        domain=cfg["DOMAIN"],
        secure=cfg["SECURE"],
        httponly=cfg["HTTPONLY"],
        samesite=cfg["SAMESITE"],
    )


def require_csrf_guard(request: Request) -> None:
    """ADR-0003: `X-Requested-With: simple-pos` is mandatory, and `Origin`, when sent, must be an allowed origin.

    Failure → 401 UNAUTHENTICATED (no new error code is invented).
    """
    if request.META.get("HTTP_X_REQUESTED_WITH") != settings.CSRF_HEADER_VALUE:
        raise AppError(ErrorCode.UNAUTHENTICATED)
    origin = request.META.get("HTTP_ORIGIN")
    if origin is not None and origin not in settings.CORS_ALLOWED_ORIGINS:
        raise AppError(ErrorCode.UNAUTHENTICATED)
