"""Application exceptions carrying a BR §9 code (ADR-0010).

Services raise ``AppError(ErrorCode.X, details={...})``; the central handler renders the envelope.
"""

from typing import Any

from rest_framework.exceptions import APIException

from common.error_codes import ErrorCode, http_status, message


class AppError(APIException):
    """A rejected operation with a stable BR §9 code."""

    def __init__(self, code: ErrorCode, details: dict[str, Any] | None = None) -> None:
        self.error_code = code
        self.status_code = http_status(code)
        self.details: dict[str, Any] = details or {}
        super().__init__(detail=message(code), code=code.value)
