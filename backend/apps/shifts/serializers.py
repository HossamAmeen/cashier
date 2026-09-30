from rest_framework import serializers

from common.pagination import PaginationSerializer, StandardPagination
from .models import Shift


class ShiftOpenSerializer(serializers.Serializer[dict[str, int]]):
    opening_balance_minor = serializers.IntegerField(default=0, required=False)

    def validate_opening_balance_minor(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Opening balance cannot be negative")
        return value


class ShiftCloseSerializer(serializers.Serializer[dict[str, int]]):
    counted_cash_minor = serializers.IntegerField(min_value=0)


class ShiftSerializer(serializers.ModelSerializer[Shift]):
    code = serializers.CharField(read_only=True)
    cashier_id = serializers.IntegerField(source="cashier.id", read_only=True)
    cashier_name = serializers.CharField(source="cashier.name", read_only=True)
    sales_total_minor = serializers.IntegerField(read_only=True)
    cash_total_minor = serializers.IntegerField(read_only=True)
    card_total_minor = serializers.IntegerField(read_only=True)
    orders_count = serializers.IntegerField(read_only=True)
    open_orders_count = serializers.IntegerField(read_only=True)
    open_order_numbers = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    expected_cash_minor = serializers.IntegerField(read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id",
            "code",
            "cashier_id",
            "cashier_name",
            "status",
            "opened_at",
            "closed_at",
            "opening_balance_minor",
            "sales_total_minor",
            "cash_total_minor",
            "card_total_minor",
            "orders_count",
            "open_orders_count",
            "open_order_numbers",
            "expected_cash_minor",
            "counted_cash_minor",
            "difference_minor",
        ]


class ShiftSummarySerializer(serializers.ModelSerializer[Shift]):
    code = serializers.CharField(read_only=True)
    cashier_id = serializers.IntegerField(source="cashier.id", read_only=True)
    cashier_name = serializers.CharField(source="cashier.name", read_only=True)
    sales_total_minor = serializers.IntegerField(read_only=True)
    orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id",
            "code",
            "cashier_id",
            "cashier_name",
            "status",
            "opened_at",
            "closed_at",
            "orders_count",
            "sales_total_minor",
            "difference_minor",
        ]


class ShiftPageSerializer(serializers.Serializer[dict[str, list[dict[str, str | int]] | dict[str, int]]]):
    items = ShiftSummarySerializer(many=True)
    pagination = PaginationSerializer()
