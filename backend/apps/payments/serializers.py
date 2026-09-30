from rest_framework import serializers

from apps.orders.serializers import OrderSerializer
from apps.payments.models import Payment, PaymentMethod


class PaymentCreateSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=PaymentMethod.choices)
    amount_received_minor = serializers.IntegerField(min_value=0, required=False, allow_null=True, default=None)


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id")

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "method",
            "amount_due_minor",
            "amount_received_minor",
            "change_minor",
            "paid_at",
        ]


class PaymentResultSerializer(serializers.Serializer):
    payment = PaymentSerializer()
    order = OrderSerializer()


class ReceiptLineSerializer(serializers.Serializer):
    name = serializers.CharField()
    qty = serializers.IntegerField()
    line_total_minor = serializers.IntegerField()


class ReceiptSerializer(serializers.Serializer):
    business_name = serializers.CharField()
    order_number = serializers.IntegerField()
    order_type = serializers.CharField()
    table_number = serializers.IntegerField(allow_null=True)
    paid_at = serializers.CharField()
    cashier_name = serializers.CharField()
    lines = ReceiptLineSerializer(many=True)
    subtotal_minor = serializers.IntegerField()
    discount_minor = serializers.IntegerField()
    total_minor = serializers.IntegerField()
    payment_method = serializers.CharField()
    amount_received_minor = serializers.IntegerField(allow_null=True)
    change_minor = serializers.IntegerField(allow_null=True)
    receipt_footer = serializers.CharField()
