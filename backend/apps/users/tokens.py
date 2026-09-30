"""JWT pair with the token-version (`tv`) and remember-me (`remember`) claims (ADR-0011, OQ-6)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch

if TYPE_CHECKING:
    from .models import User

TOKEN_VERSION_CLAIM = "tv"  # noqa: S105
REMEMBER_CLAIM = "remember"


class PosRefreshToken(RefreshToken):
    """Refresh token carrying `tv` (copied to the access token) and `remember` (refresh only)."""

    no_copy_claims = (*RefreshToken.no_copy_claims, REMEMBER_CLAIM)  # type: ignore[assignment]

    @classmethod
    def issue(cls, user: User, *, remember: bool) -> PosRefreshToken:
        """A new refresh token for `user`, recorded as outstanding so logout/rotation can blacklist it."""
        token = cls()
        token[api_settings.USER_ID_CLAIM] = user.pk
        token[TOKEN_VERSION_CLAIM] = user.token_version
        token[REMEMBER_CLAIM] = bool(remember)
        OutstandingToken.objects.create(
            user=user,
            jti=token[api_settings.JTI_CLAIM],
            token=str(token),
            created_at=token.current_time,
            expires_at=datetime_from_epoch(token["exp"]),
        )
        return token


def access_lifetime_seconds() -> int:
    return int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
