"""GET /api/health (DRF_SKILL §23–27). Liveness only; does not depend on optional services."""

import hmac
from typing import Any

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.error_codes import ErrorCode
from common.exceptions import AppError
from common.throttling import HealthRateThrottle

HEADER = "HTTP_X_HEALTH_CHECK_TOKEN"


def _token_from(request: Request) -> str:
    header = request.META.get(HEADER)
    if header:
        return str(header)
    return str(request.query_params.get("password", ""))


class HealthView(APIView):
    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]
    throttle_classes = [HealthRateThrottle]

    @extend_schema(
        operation_id="getHealth",
        auth=[],
        parameters=[
            OpenApiParameter("X-Health-Check-Token", OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
            OpenApiParameter("password", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses={
            200: inline_serializer(
                "Health",
                fields={"status": serializers.ChoiceField(choices=["healthy"])},
            )
        },
    )
    def get(self, request: Request) -> Response:
        supplied = _token_from(request)
        expected = str(settings.HEALTH_CHECK_PASSWORD)
        if not supplied or not hmac.compare_digest(supplied.encode(), expected.encode()):
            raise AppError(ErrorCode.UNAUTHENTICATED)
        return Response({"status": "healthy"})
