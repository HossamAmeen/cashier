"""Scoped DRF throttles (DRF_SKILL §68, ADR-0009). Rates come from env via settings.

BR-AUTH-03 (5 failed logins per username+IP per 5 min) is NOT a DRF throttle; it lives in apps/users.
"""

from typing import Any

from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle


class _IpScopedThrottle(SimpleRateThrottle):
    def get_cache_key(self, request: Request, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class AuthRateThrottle(_IpScopedThrottle):
    """Applied to login/refresh/logout; keyed by client IP (RATELIMIT_AUTH)."""

    scope = "auth"


class HealthRateThrottle(_IpScopedThrottle):
    """Health endpoint (RATELIMIT_HEALTH), so deploy checks are not blocked by the anon limit."""

    scope = "health"
