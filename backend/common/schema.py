"""drf-spectacular helpers (ADR-0008): make the generated schema comparable with docs/api/openapi.yaml."""

from typing import Any

from drf_spectacular.utils import OpenApiResponse, inline_serializer
from rest_framework import serializers

from common.error_codes import ErrorCode

SUCCESS_WRAPPED = "x-envelope"

# The error envelope (ADR-0010). One component shared by every documented 4xx/5xx response.
ERROR_SERIALIZER = inline_serializer(
    "Error",
    fields={
        "success": serializers.BooleanField(),
        "code": serializers.ChoiceField(choices=[c.value for c in ErrorCode]),
        "message": serializers.CharField(),
        "details": serializers.DictField(),
    },
)


def error_responses(*statuses: int) -> dict[int, OpenApiResponse]:
    """`responses={...}` entries for the operation's error statuses (codes are listed in the contract)."""
    return {status: OpenApiResponse(response=ERROR_SERIALIZER) for status in statuses}


def _wrap(schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "required": ["success", "message", "data"],
        "properties": {
            "success": {"type": "boolean", "enum": [True]},
            "message": {"type": "string"},
            "data": schema,
        },
    }


def wrap_success_envelope(result: dict[str, Any], generator: Any, request: Any, public: bool) -> dict[str, Any]:
    """Wrap every 2xx JSON response body in the success envelope (ADR-0010)."""
    for path_item in result.get("paths", {}).values():
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            for status, response in operation.get("responses", {}).items():
                if not str(status).startswith("2") or str(status) == "204":
                    continue
                content = response.get("content", {}).get("application/json")
                if content is None or "schema" not in content:
                    continue
                schema = content["schema"]
                if schema.get(SUCCESS_WRAPPED):
                    continue
                content["schema"] = _wrap(schema)
    return result
