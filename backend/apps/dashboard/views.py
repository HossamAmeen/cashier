from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import get_admin_dashboard, get_cashier_dashboard
from .serializers import AdminDashboardSerializer, CashierDashboardSerializer


class CashierDashboardView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getCashierDashboard",
        tags=["dashboard"],
        responses={200: CashierDashboardSerializer},
    )
    def get(self, request: Request) -> Response:
        data = get_cashier_dashboard(request.user)
        serializer = CashierDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDashboardView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getAdminDashboard",
        tags=["dashboard"],
        responses={200: AdminDashboardSerializer},
    )
    def get(self, request: Request) -> Response:
        data = get_admin_dashboard(request.user)
        serializer = AdminDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
