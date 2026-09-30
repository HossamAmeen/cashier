"""Bearer authentication with immediate revocation (BR-AUTH-02, OQ-31, ADR-0011 §4).

An access token is accepted only if its user exists, is ACTIVE and its `tv` claim equals the user's current
`token_version`. Anything else → AuthenticationFailed → 401 UNAUTHENTICATED (common/exception_handler.py).
"""

from typing import Any

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

from .models import User, UserStatus
from .tokens import TOKEN_VERSION_CLAIM


def session_is_current(user: User, token_version: Any) -> bool:
    """True if a token with claim `tv=token_version` may still act for `user` (shared by bearer auth and refresh)."""
    return user.status == UserStatus.ACTIVE and token_version == user.token_version


class PosJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token: Token) -> User:  # type: ignore[override]
        user = super().get_user(validated_token)  # unknown user / inactive → AuthenticationFailed
        if not isinstance(user, User) or not session_is_current(user, validated_token.get(TOKEN_VERSION_CLAIM)):
            raise AuthenticationFailed("Session revoked", code="session_revoked")
        return user
