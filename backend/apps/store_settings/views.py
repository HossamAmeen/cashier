"""Settings views matching docs/api/openapi.yaml."""

from typing import Any

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin

from .models import Settings
from .serializers import SettingsSerializer, SettingsUpdateSerializer
from .services import update_settings


class SettingsView(APIView):
    def get_permissions(self) -> list[Any]:
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdmin()]

    @extend_schema(
        operation_id="getSettings",
        tags=["settings"],
        responses={200: SettingsSerializer},
    )
    def get(self, request: Request) -> Response:
        settings_obj = Settings.get_solo()
        return Response(SettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="updateSettings",
        tags=["settings"],
        request=SettingsUpdateSerializer,
        responses={200: SettingsSerializer},
    )
    def patch(self, request: Request) -> Response:
        serializer = SettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data: dict[str, Any] = serializer.validated_data

        settings_obj = update_settings(**data)
        return Response(SettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)
