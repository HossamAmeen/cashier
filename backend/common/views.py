"""JSON handlers for Django-level 404/500 so every response uses the envelope (ADR-0010)."""

import json
from typing import Any

from django.http import HttpRequest, HttpResponse

from common.error_codes import ErrorCode, http_status
from common.exception_handler import error_body


def _json(code: ErrorCode) -> HttpResponse:
    return HttpResponse(
        json.dumps(error_body(code), ensure_ascii=False),
        status=http_status(code),
        content_type="application/json",
    )


def json_not_found(request: HttpRequest, exception: Any = None) -> HttpResponse:
    return _json(ErrorCode.NOT_FOUND)


def json_server_error(request: HttpRequest) -> HttpResponse:
    return _json(ErrorCode.INTERNAL_ERROR)
