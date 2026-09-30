"""OpenAPI security schemes named as in docs/api/openapi.yaml (`bearerAuth`, `refreshCookie`)."""

from typing import Any

from drf_spectacular.extensions import OpenApiAuthenticationExtension

REFRESH_COOKIE_SECURITY: list[dict[str, list[Any]]] = [{"refreshCookie": []}]
REFRESH_COOKIE_SCHEME = {"type": "apiKey", "in": "cookie", "name": "pos_refresh"}


class PosJWTAuthenticationScheme(OpenApiAuthenticationExtension):  # type: ignore[no-untyped-call]
    target_class = "apps.users.authentication.PosJWTAuthentication"
    name = "bearerAuth"
    priority = 1

    def get_security_definition(self, auto_schema: Any) -> dict[str, str]:
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
