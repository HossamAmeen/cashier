from rest_framework import serializers

from apps.orders.serializers import OrderListItemSerializer
from apps.shifts.serializers import ShiftSerializer


class TableOccupancySerializer(serializers.Serializer[dict[str, int]]):
    total_active = serializers.IntegerField()
    available = serializers.IntegerField()
    occupied = serializers.IntegerField()
    occupied_total_minor = serializers.IntegerField()


class CashierDashboardSerializer(serializers.Serializer[dict[str, object]]):
    shift = ShiftSerializer(allow_null=True)
    tables = TableOccupancySerializer()
    running_orders = OrderListItemSerializer(many=True)


class OpenShiftRowSerializer(serializers.Serializer[dict[str, object]]):
    shift_id = serializers.IntegerField()
    code = serializers.CharField()
    cashier_id = serializers.IntegerField()
    cashier_name = serializers.CharField()
    opened_at = serializers.DateTimeField()
    sales_total_minor = serializers.IntegerField()


class OpenShiftsSummarySerializer(serializers.Serializer[dict[str, object]]):
    count = serializers.IntegerField()
    items = OpenShiftRowSerializer(many=True)


class CashierCountsSerializer(serializers.Serializer[dict[str, int]]):
    total_active = serializers.IntegerField()
    with_open_shift = serializers.IntegerField()
    without_open_shift = serializers.IntegerField()


class OrderDayCountsSerializer(serializers.Serializer[dict[str, int]]):
    total = serializers.IntegerField()
    open = serializers.IntegerField()
    paid = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class AdminDashboardSerializer(serializers.Serializer[dict[str, object]]):
    business_date = serializers.CharField()
    sales_today_minor = serializers.IntegerField()
    paid_orders_today = serializers.IntegerField()
    orders_today = OrderDayCountsSerializer()
    open_shifts = OpenShiftsSummarySerializer()
    tables = TableOccupancySerializer()
    cashiers = CashierCountsSerializer()
    recent_orders = OrderListItemSerializer(many=True)
