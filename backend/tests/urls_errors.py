"""Throw-away views used only by tests/test_error_envelope.py."""

from typing import Any

from django.urls import path
from rest_framework import serializers
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, Throttled
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.error_codes import ErrorCode
from common.exceptions import AppError


class _Line(serializers.Serializer):  # type: ignore[type-arg]
    qty = serializers.IntegerField(min_value=1)


class _Body(serializers.Serializer):  # type: ignore[type-arg]
    lines = _Line(many=True)


class _Base(APIView):
    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]
    throttle_classes: list[Any] = []


class OkView(_Base):
    def get(self, request: Request) -> Response:
        return Response({"value": 1})


class AppErrorView(_Base):
    def get(self, request: Request) -> Response:
        raise AppError(ErrorCode.SHIFT_HAS_OPEN_ORDERS, details={"open_order_numbers": [1047, 1049]})


class ValidationView(_Base):
    def post(self, request: Request) -> Response:
        _Body(data=request.data).is_valid(raise_exception=True)
        return Response({})


class UnauthView(_Base):
    def get(self, request: Request) -> Response:
        raise NotAuthenticated()


class ForbiddenView(_Base):
    def get(self, request: Request) -> Response:
        raise PermissionDenied()


class ThrottledView(_Base):
    def get(self, request: Request) -> Response:
        raise Throttled(wait=12.2)


class CrashView(_Base):
    def get(self, request: Request) -> Response:
        raise RuntimeError("boom secret detail")


urlpatterns = [
    path("ok", OkView.as_view()),
    path("app-error", AppErrorView.as_view()),
    path("validation", ValidationView.as_view()),
    path("unauth", UnauthView.as_view()),
    path("forbidden", ForbiddenView.as_view()),
    path("throttled", ThrottledView.as_view()),
    path("crash", CrashView.as_view()),
]
handler404 = "common.views.json_not_found"
