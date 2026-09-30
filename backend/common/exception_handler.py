"""Central exception handler (DRF_SKILL §20, ADR-0010). Views never format errors themselves."""

import logging
import math
from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions as drf_exc
from rest_framework.response import Response

from common.error_codes import ErrorCode, http_status, message
from common.exceptions import AppError

logger = logging.getLogger(__name__)


def error_body(code: ErrorCode, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"success": False, "code": code.value, "message": message(code), "details": details or {}}


def _normalise_field_errors(detail: Any, prefix: str = "") -> dict[str, list[str]]:
    """Flatten DRF's nested ValidationError detail into {"lines.0.qty": ["..."]}."""
    out: dict[str, list[str]] = {}
    if isinstance(detail, dict):
        for key, value in detail.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            out.update(_normalise_field_errors(value, path))
    elif isinstance(detail, list):
        if all(not isinstance(v, (dict, list)) for v in detail):
            out[prefix or "non_field_errors"] = [str(v) for v in detail]
        else:
            for index, value in enumerate(detail):
                path = f"{prefix}.{index}" if prefix else str(index)
                out.update(_normalise_field_errors(value, path))
    else:
        out[prefix or "non_field_errors"] = [str(detail)]
    return out


def _classify(exc: Exception) -> tuple[ErrorCode, dict[str, Any]] | None:
    if isinstance(exc, AppError):
        return exc.error_code, exc.details
    if isinstance(exc, drf_exc.ValidationError):
        return ErrorCode.VALIDATION_ERROR, {"fields": _normalise_field_errors(exc.detail)}
    if isinstance(exc, (drf_exc.ParseError, drf_exc.UnsupportedMediaType, drf_exc.NotAcceptable)):
        return ErrorCode.VALIDATION_ERROR, {}
    if isinstance(exc, (drf_exc.NotAuthenticated, drf_exc.AuthenticationFailed)):
        return ErrorCode.UNAUTHENTICATED, {}
    if isinstance(exc, (drf_exc.PermissionDenied, DjangoPermissionDenied)):
        return ErrorCode.FORBIDDEN_ROLE, {}
    if isinstance(exc, (drf_exc.NotFound, Http404, drf_exc.MethodNotAllowed)):
        return ErrorCode.NOT_FOUND, {}
    if isinstance(exc, drf_exc.Throttled):
        wait: float | None = getattr(exc, "wait", None)
        return ErrorCode.TOO_MANY_ATTEMPTS, {"retry_after_seconds": math.ceil(wait) if wait is not None else None}
    return None


def envelope_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    classified = _classify(exc)
    details: dict[str, Any]
    if classified is None:
        logger.exception("unhandled_exception", extra={"view": str(context.get("view"))})
        code, details = ErrorCode.INTERNAL_ERROR, {}
    else:
        code, details = classified
    headers: dict[str, str] = {}
    retry = details.get("retry_after_seconds")
    if code is ErrorCode.TOO_MANY_ATTEMPTS and retry is not None:
        headers["Retry-After"] = str(retry)
    auth_header = getattr(exc, "auth_header", None)
    if code is ErrorCode.UNAUTHENTICATED and auth_header:
        headers["WWW-Authenticate"] = str(auth_header)
    return Response(error_body(code, details), status=http_status(code), headers=headers)
