from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import get_receipt
from .serializers import (
    PaymentCreateSerializer,
    PaymentResultSerializer,
    ReceiptSerializer,
)
from .services import pay_order


class PaymentCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="payOrder",
        tags=["payments"],
        parameters=[
            OpenApiParameter(
                name="Idempotency-Key",
                type=str,
                location=OpenApiParameter.HEADER,
                required=False,
                description="UUID or unique string for idempotent retry (BR-PAY-04)",
            ),
        ],
        request=PaymentCreateSerializer,
        responses={200: PaymentResultSerializer},
    )
    def post(self, request: Request, id: int) -> Response:
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        idempotency_key = (
            request.headers.get("Idempotency-Key") or request.META.get("HTTP_IDEMPOTENCY_KEY")
        )

        res = pay_order(
            order_id=id,
            user=request.user,
            method=serializer.validated_data["method"],
            amount_received_minor=serializer.validated_data.get("amount_received_minor"),
            idempotency_key=idempotency_key,
            payload_data=request.data,
        )

        out_serializer = PaymentResultSerializer(res)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class ReceiptDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="getOrderReceipt",
        tags=["payments"],
        responses={200: ReceiptSerializer},
    )
    def get(self, request: Request, id: int) -> Response:
        receipt_data = get_receipt(order_id=id, user=request.user)
        out_serializer = ReceiptSerializer(receipt_data)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
