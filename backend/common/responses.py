"""Success envelope (DRF_SKILL §19, ADR-0010): {"success": true, "message": "OK", "data": ...}.

Error bodies are produced by common.exception_handler and pass through unchanged.
"""

from collections.abc import Mapping
from typing import Any

from rest_framework.renderers import JSONRenderer

SUCCESS_MESSAGE = "OK"


def success_body(data: Any) -> dict[str, Any]:
    return {"success": True, "message": SUCCESS_MESSAGE, "data": data}


class EnvelopeJSONRenderer(JSONRenderer):
    def render(
        self,
        data: Any,
        accepted_media_type: str | None = None,
        renderer_context: Mapping[str, Any] | None = None,
    ) -> bytes:
        response = (renderer_context or {}).get("response")
        status_code = getattr(response, "status_code", 200)
        if status_code == 204:
            return b""
        already_wrapped = isinstance(data, dict) and "success" in data and ("data" in data or "code" in data)
        if status_code < 400 and not already_wrapped:
            data = success_body(data)
        rendered: bytes = super().render(data, accepted_media_type, renderer_context)
        return rendered
