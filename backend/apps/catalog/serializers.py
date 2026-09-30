from rest_framework import serializers

from .models import Category, CategoryIcon, Item


class CategorySerializer(serializers.ModelSerializer[Category]):
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "sort_order",
            "status",
            "icon",
            "item_count",
            "created_at",
        ]


class CategoryCreateSerializer(serializers.Serializer[dict[str, str | int | None]]):
    name = serializers.CharField(max_length=80)
    sort_order = serializers.IntegerField(default=0, required=False)
    status = serializers.ChoiceField(
        choices=["ACTIVE", "DISABLED"], default="ACTIVE", required=False
    )
    icon = serializers.ChoiceField(
        choices=CategoryIcon.choices, allow_null=True, required=False, default=None
    )


class CategoryUpdateSerializer(serializers.Serializer[dict[str, str | int | None]]):
    name = serializers.CharField(max_length=80, required=False)
    sort_order = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(
        choices=["ACTIVE", "DISABLED"], required=False
    )
    icon = serializers.ChoiceField(
        choices=CategoryIcon.choices, allow_null=True, required=False
    )


class ItemSerializer(serializers.ModelSerializer[Item]):
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    in_use = serializers.BooleanField(read_only=True)

    class Meta:
        model = Item
        fields = [
            "id",
            "category_id",
            "category_name",
            "category_icon",
            "name",
            "price_minor",
            "description",
            "status",
            "in_use",
            "created_at",
        ]


class ItemCreateSerializer(serializers.Serializer[dict[str, str | int]]):
    category_id = serializers.IntegerField()
    name = serializers.CharField(max_length=80)
    price_minor = serializers.IntegerField()
    description = serializers.CharField(
        allow_blank=True, default="", required=False
    )
    status = serializers.ChoiceField(
        choices=["ACTIVE", "DISABLED"], default="ACTIVE", required=False
    )

    def validate_price_minor(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero")
        return value


class ItemUpdateSerializer(serializers.Serializer[dict[str, str | int]]):
    category_id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=80, required=False)
    price_minor = serializers.IntegerField(required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    status = serializers.ChoiceField(
        choices=["ACTIVE", "DISABLED"], required=False
    )

    def validate_price_minor(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero")
        return value


class CatalogItemSerializer(serializers.ModelSerializer[Item]):
    class Meta:
        model = Item
        fields = ["id", "name", "price_minor", "description"]


class CatalogCategorySerializer(serializers.ModelSerializer[Category]):
    items = CatalogItemSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "sort_order", "icon", "items"]


class CatalogSerializer(serializers.Serializer[dict[str, list[dict[str, str | int]]]]):
    categories = CatalogCategorySerializer(many=True)
