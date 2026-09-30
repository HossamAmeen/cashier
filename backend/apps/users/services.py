"""Auth workflows: login with the BR-AUTH-03 counter, refresh rotation, logout (ADR-0009, ADR-0011).

Views call these functions and never format errors; every rejection is an ``AppError`` with a BR §9 code.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.db import connection, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .authentication import session_is_current
from .models import LoginFailure, User, UserStatus, normalize_username
from .tokens import REMEMBER_CLAIM, TOKEN_VERSION_CLAIM, PosRefreshToken

# BR-AUTH-03 — business constants, deliberately not configurable (ADR-0004 §6, ADR-0009 §1).
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW = timedelta(seconds=300)
LOGIN_FAILURE_RETENTION = timedelta(days=1)

# BR-USR-01
MIN_PASSWORD_LENGTH = 8


@dataclass(frozen=True)
class Session:
    """A freshly issued token pair (login or refresh)."""

    user: User
    access_token: str
    refresh_token: str
    remember: bool


def _issue_session(user: User, *, remember: bool) -> Session:
    refresh = PosRefreshToken.issue(user, remember=remember)
    return Session(user=user, access_token=str(refresh.access_token), refresh_token=str(refresh), remember=remember)


def _lock_login_key(username: str, ip: str) -> None:
    """Serialise attempts for one (username, IP) so parallel requests cannot exceed the limit (BR-AUTH-03)."""
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", [f"login:{username}\x00{ip}"])


def _retry_after_seconds(failure_times: list[datetime], now: datetime) -> int:
    """Seconds until enough counted failures leave the window for the count to drop below the limit."""
    pivot = failure_times[len(failure_times) - LOGIN_MAX_FAILURES]
    return max(1, math.ceil((pivot + LOGIN_WINDOW - now).total_seconds()))


def _password_matches(user: User | None, password: str) -> bool:
    if user is None:
        # Equalise timing with a real argon2 verify so unknown usernames are not detectable (BR-AUTH-01, ADR-0009).
        User().set_password(password)
        return False
    return user.check_password(password)


def login(*, username: str, password: str, ip: str, remember: bool) -> Session:
    """BR-AUTH-01..03, OQ-30. Order: lockout → credentials → DISABLED → success (clears the counter)."""
    key = normalize_username(username)
    outcome: ErrorCode | None = None
    details: dict[str, int] = {}

    with transaction.atomic():
        _lock_login_key(key, ip)
        now = timezone.now()
        recent = list(
            LoginFailure.objects.filter(username_normalized=key, ip=ip, created_at__gt=now - LOGIN_WINDOW)
            .order_by("created_at")
            .values_list("created_at", flat=True)
        )
        user = User.objects.filter(username=key).first()
        if len(recent) >= LOGIN_MAX_FAILURES:
            # (1) Refused before the password is looked at, even if it is correct (BR-AUTH-03, OQ-30).
            outcome = ErrorCode.TOO_MANY_ATTEMPTS
            details = {"retry_after_seconds": _retry_after_seconds(recent, now)}
        elif not _password_matches(user, password):
            # (2) Unknown user and wrong password are indistinguishable (BR-AUTH-01).
            LoginFailure.objects.create(username_normalized=key, ip=ip, created_at=now)
            outcome = ErrorCode.INVALID_CREDENTIALS
        elif user is None or user.status != UserStatus.ACTIVE:
            # (3) Revealed only after a correct password; not a failure (BR-AUTH-02, OQ-30).
            outcome = ErrorCode.USER_DISABLED
        else:
            # (4) Success clears this (username, IP) counter (OQ-30) and purges old rows opportunistically.
            LoginFailure.objects.filter(username_normalized=key, ip=ip).delete()
            LoginFailure.objects.filter(created_at__lt=now - LOGIN_FAILURE_RETENTION).delete()
            user.last_login_at = now
            user.save(update_fields=["last_login_at"])

    if outcome is not None or user is None:
        raise AppError(outcome or ErrorCode.INVALID_CREDENTIALS, details=details)
    return _issue_session(user, remember=remember)


def _decode_refresh(raw: str | None) -> PosRefreshToken:
    """Signature, expiry, type and blacklist are checked by simplejwt; any failure → UNAUTHENTICATED."""
    if not raw:
        raise AppError(ErrorCode.UNAUTHENTICATED)
    try:
        return PosRefreshToken(raw)  # type: ignore[arg-type]
    except TokenError as exc:
        raise AppError(ErrorCode.UNAUTHENTICATED) from exc


def refresh_session(raw_refresh: str | None) -> Session:
    """Rotate the refresh token (single use) and issue a new pair (ADR-0011 §2, BR-AUTH-02, OQ-31)."""
    token = _decode_refresh(raw_refresh)
    jti = token[api_settings.JTI_CLAIM]
    with transaction.atomic():
        outstanding = OutstandingToken.objects.select_for_update().filter(jti=jti).first()
        if outstanding is None or BlacklistedToken.objects.filter(token=outstanding).exists():
            # Unknown to the server, or already rotated/logged out by a parallel request.
            raise AppError(ErrorCode.UNAUTHENTICATED)
        # Single use: the presented token is spent whether or not the session is still valid.
        BlacklistedToken.objects.create(token=outstanding)
        user = User.objects.filter(pk=token.get(api_settings.USER_ID_CLAIM)).first()
        current = user is not None and session_is_current(user, token.get(TOKEN_VERSION_CLAIM))
    if user is None or not current:
        # DISABLED user or stale token version (disable / password or role change) → UNAUTHENTICATED (BR-AUTH-02).
        raise AppError(ErrorCode.UNAUTHENTICATED)
    return _issue_session(user, remember=bool(token.get(REMEMBER_CLAIM, False)))


def logout(raw_refresh: str | None) -> None:
    """Blacklist this device's refresh token; idempotent (OQ-29: other sessions and any OPEN shift are untouched)."""
    if not raw_refresh:
        return
    try:
        token = PosRefreshToken(raw_refresh)  # type: ignore[arg-type]
    except TokenError:
        return  # already revoked, expired or garbage: nothing to end
    token.blacklist()


def revoke_sessions(user: User) -> None:
    """Invalidate every access and refresh token of `user` on their next use (BR-AUTH-02, OQ-31, ADR-0011 §4).

    Callers (disable, password change, role change — T02-BE-01) run inside their own transaction.
    """
    User.objects.filter(pk=user.pk).update(token_version=F("token_version") + 1)
    user.refresh_from_db(fields=["token_version"])


def validate_new_password(raw: str) -> None:
    """BR-USR-01: at least 8 characters. Raises VALIDATION_ERROR with the field path."""
    if len(raw or "") < MIN_PASSWORD_LENGTH:
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            details={"fields": {"password": [f"Ensure this field has at least {MIN_PASSWORD_LENGTH} characters."]}},
        )
