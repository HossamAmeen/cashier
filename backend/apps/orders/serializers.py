from rest_framework import serializers

from apps.orders.models import Order, OrderLine, OrderType


class OrderLineInputSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1, max_value=999)
    note = serializers.CharField(max_length=140, required=False, allow_blank=True, default="")


class OrderCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=OrderType.choices)
    table_id = serializers.IntegerField(min_value=1, required=False, allow_null=True, default=None)
    lines = serializers.ListField(child=OrderLineInputSerializer(), allow_empty=True)
    discount_minor = serializers.IntegerField(min_value=0, default=0)


class OrderLineUpdateInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1, required=False, allow_null=True, default=None)
    item_id = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1, max_value=999)
    note = serializers.CharField(max_length=140, required=False, allow_blank=True, default="")


class OrderUpdateSerializer(serializers.Serializer):
    lines = serializers.ListField(child=OrderLineUpdateInputSerializer(), allow_empty=True)
    discount_minor = serializers.IntegerField(min_value=0)


class OrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=200)


class OrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLine
        fields = [
            "id",
            "item_id",
            "item_name",
            "unit_price_minor",
            "qty",
            "subtotal_minor",
            "notes",
        ]


class OrderSerializer(serializers.ModelSerializer):
    table_id = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()
    cashier_id = serializers.IntegerField(source="cashier.id")
    cashier_name = serializers.CharField(source="cashier.name")
    shift_id = serializers.IntegerField(source="shift.id")
    lines = OrderLineSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "number",
            "type",
            "status",
            "table_id",
            "table_number",
            "cashier_id",
            "cashier_name",
            "shift_id",
            "lines",
            "item_count",
            "subtotal_minor",
            "discount_minor",
            "total_minor",
            "created_at",
            "paid_at",
            "cancelled_at",
            "cancel_reason",
            "payment",
        ]

    def get_table_id(self, obj: Order) -> int | None:
        return obj.table_id

    def get_table_number(self, obj: Order) -> int | None:
        return obj.table.number if obj.table else None

    def get_item_count(self, obj: Order) -> int:
        return sum(line.qty for line in obj.lines.all())

    def get_paid_at(self, obj: Order) -> str | None:
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.paid_at.isoformat()
        return None

    def get_payment(self, obj: Order) -> dict | None:
        if hasattr(obj, "payment") and obj.payment:
            return {
                "method": obj.payment.method,
                "amount_received_minor": obj.payment.amount_received_minor,
                "change_minor": obj.payment.change_minor,
                "paid_at": obj.payment.paid_at.isoformat(),
            }
        return None


class OrderListItemSerializer(serializers.ModelSerializer):
    table_number = serializers.SerializerMethodField()
    cashier_id = serializers.IntegerField(source="cashier.id")
    cashier_name = serializers.CharField(source="cashier.name")
    item_count = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "number",
            "type",
            "status",
            "table_number",
            "cashier_id",
            "cashier_name",
            "item_count",
            "total_minor",
            "payment_method",
            "created_at",
            "paid_at",
        ]

    def get_table_number(self, obj: Order) -> int | None:
        return obj.table.number if obj.table else None

    def get_item_count(self, obj: Order) -> int:
        return sum(line.qty for line in obj.lines.all())

    def get_payment_method(self, obj: Order) -> str | None:
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.method
        return None

    def get_paid_at(self, obj: Order) -> str | None:
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.paid_at.isoformat()
        return None


class OrderDayCountsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    paid = serializers.IntegerField()
    open = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class OrderPageSerializer(serializers.Serializer):
    items = OrderListItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    today_counts = OrderDayCountsSerializer()

