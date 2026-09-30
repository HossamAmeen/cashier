from rest_framework import serializers

from .models import Table


class TableCurrentOrderSerializer(serializers.Serializer[dict[str, str | int]]):
    id = serializers.IntegerField()
    number = serializers.IntegerField()
    item_count = serializers.IntegerField()
    total_minor = serializers.IntegerField()
    cashier_id = serializers.IntegerField()
    cashier_name = serializers.CharField()
    created_at = serializers.CharField()


class TableSerializer(serializers.ModelSerializer[Table]):
    status = serializers.CharField(read_only=True)
    current_order = TableCurrentOrderSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Table
        fields = [
            "id",
            "number",
            "is_active",
            "status",
            "current_order",
            "created_at",
        ]


class TableCreateSerializer(serializers.Serializer[dict[str, int | bool]]):
    number = serializers.IntegerField()
    is_active = serializers.BooleanField(default=True, required=False)

    def validate_number(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Table number must be positive")
        return value


class TableUpdateSerializer(serializers.Serializer[dict[str, int | bool]]):
    number = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)

    def validate_number(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Table number must be positive")
        return value


class TableCountsSerializer(serializers.Serializer[dict[str, int]]):
    all = serializers.IntegerField()
    available = serializers.IntegerField()
    occupied = serializers.IntegerField()


class TableListSerializer(serializers.Serializer[dict[str, list[dict[str, str | int]] | dict[str, int]]]):
    items = TableSerializer(many=True)
    counts = TableCountsSerializer()
