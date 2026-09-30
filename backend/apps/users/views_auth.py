"""Auth views (login, refreshSession, logout, getMe) matching docs/api/openapi.yaml."""

from typing import Any, cast

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .cookies import clear_refresh_cookie, read_refresh_cookie, require_csrf_guard, set_refresh_cookie
from .models import User
from .serializers import AuthSessionSerializer, CurrentUserSerializer, LoginRequestSerializer
from .services import login, logout, refresh_session


class LoginView(APIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        operation_id="login",
        tags=["auth"],
        request=LoginRequestSerializer,
        responses={200: AuthSessionSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data: dict[str, Any] = serializer.validated_data
        client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()

        session = login(
            username=data["username"],
            password=data["password"],
            ip=client_ip,
            remember=data.get("remember_me", False),
        )

        resp = Response(AuthSessionSerializer(session).data, status=status.HTTP_200_OK)
        set_refresh_cookie(resp, session.refresh_token, remember=session.remember)
        return resp


class RefreshSessionView(APIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        operation_id="refreshSession",
        tags=["auth"],
        parameters=[
            OpenApiParameter(name="X-Requested-With", location=OpenApiParameter.HEADER, required=True, type=str),
        ],
        request=None,
        responses={200: AuthSessionSerializer},
    )
    def post(self, request: Request) -> Response:
        require_csrf_guard(request)
        raw_refresh = read_refresh_cookie(request)
        session = refresh_session(raw_refresh)
        resp = Response(AuthSessionSerializer(session).data, status=status.HTTP_200_OK)
        set_refresh_cookie(resp, session.refresh_token, remember=session.remember)
        return resp


class LogoutView(APIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        operation_id="logout",
        tags=["auth"],
        parameters=[
            OpenApiParameter(name="X-Requested-With", location=OpenApiParameter.HEADER, required=True, type=str),
        ],
        request=None,
        responses={204: None},
    )
    def post(self, request: Request) -> Response:
        require_csrf_guard(request)
        raw_refresh = read_refresh_cookie(request)
        logout(raw_refresh)
        resp = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(resp)
        return resp


class GetMeView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getMe",
        tags=["auth"],
        request=None,
        responses={200: CurrentUserSerializer},
    )
    def get(self, request: Request) -> Response:
        return Response(CurrentUserSerializer(cast(User, request.user)).data, status=status.HTTP_200_OK)
