"""Auth, User, and Cashier serializers matching docs/api/openapi.yaml."""

from typing import Any

from rest_framework import serializers

from .models import Role, User, UserStatus
from .selectors import has_open_shift
from .services import Session
from .tokens import access_lifetime_seconds


class LoginRequestSerializer(serializers.Serializer[Any]):
    """Username only, never email (OQ-4); case-insensitive (BR §2 User)."""

    username = serializers.CharField(min_length=1, max_length=64)
    password = serializers.CharField(min_length=1, max_length=128, trim_whitespace=False, write_only=True)
    remember_me = serializers.BooleanField(default=False)  # OQ-6


class CurrentUserSerializer(serializers.ModelSerializer[User]):
    """BR-AUTH-04: the PWA routes by `role`."""

    class Meta:
        model = User
        fields = ("id", "name", "username", "role", "status")
        read_only_fields = fields


class AuthSessionSerializer(serializers.Serializer[Session]):
    access_token = serializers.CharField(read_only=True)
    token_type = serializers.ChoiceField(choices=["Bearer"], read_only=True)
    access_expires_in = serializers.IntegerField(read_only=True)
    user = CurrentUserSerializer(read_only=True)

    def to_representation(self, instance: Session) -> dict[str, Any]:
        return {
            "access_token": instance.access_token,
            "token_type": "Bearer",
            "access_expires_in": access_lifetime_seconds(),
            "user": CurrentUserSerializer(instance.user).data,
        }


class UserSerializer(serializers.ModelSerializer[User]):
    has_open_shift = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "name", "username", "role", "status", "last_login_at", "created_at", "has_open_shift")
        read_only_fields = fields

    def get_has_open_shift(self, obj: User) -> bool:
        return has_open_shift(obj)


class UserCreateSerializer(serializers.Serializer[Any]):
    name = serializers.CharField(min_length=1, max_length=100)
    username = serializers.CharField(min_length=3, max_length=32)
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    role = serializers.ChoiceField(choices=Role.choices)
    status = serializers.ChoiceField(choices=UserStatus.choices, default=UserStatus.ACTIVE)


class UserUpdateSerializer(serializers.Serializer[Any]):
    name = serializers.CharField(min_length=1, max_length=100, required=False)
    username = serializers.CharField(min_length=3, max_length=32, required=False)
    password = serializers.CharField(min_length=8, max_length=128, required=False, allow_blank=True, write_only=True)
    role = serializers.ChoiceField(choices=Role.choices, required=False)
    status = serializers.ChoiceField(choices=UserStatus.choices, required=False)


class UserCountsSerializer(serializers.Serializer[Any]):
    all = serializers.IntegerField()
    admin = serializers.IntegerField()
    cashier = serializers.IntegerField()


class PaginationSerializer(serializers.Serializer[Any]):
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_items = serializers.IntegerField()
    total_pages = serializers.IntegerField()


class UserPageSerializer(serializers.Serializer[Any]):
    items = UserSerializer(many=True)
    pagination = PaginationSerializer()
    counts = UserCountsSerializer()


class ShiftRefSerializer(serializers.Serializer[Any]):
    id = serializers.IntegerField()
    code = serializers.CharField()
    opened_at = serializers.DateTimeField()


class CashierListItemSerializer(serializers.ModelSerializer[User]):
    current_shift = ShiftRefSerializer(required=True, allow_null=True)

    class Meta:
        model = User
        fields = ("id", "name", "username", "status", "last_login_at", "current_shift")
        read_only_fields = fields


class CashierCountsSerializer(serializers.Serializer[Any]):
    all = serializers.IntegerField()
    active = serializers.IntegerField()
    disabled = serializers.IntegerField()


class CashierPageSerializer(serializers.Serializer[Any]):
    items = CashierListItemSerializer(many=True)
    pagination = PaginationSerializer()
    counts = CashierCountsSerializer()


class ShiftLiveSerializer(serializers.Serializer[Any]):
    id = serializers.IntegerField()
    code = serializers.CharField()
    opened_at = serializers.DateTimeField()
    orders_count = serializers.IntegerField()
    sales_total_minor = serializers.IntegerField()


class CashierDetailSerializer(serializers.ModelSerializer[User]):
    role = serializers.ChoiceField(choices=["CASHIER"], required=True)
    current_shift = ShiftLiveSerializer(required=True, allow_null=True)

    class Meta:
        model = User
        fields = ("id", "name", "username", "role", "status", "last_login_at", "current_shift", "created_at")
        read_only_fields = fields
