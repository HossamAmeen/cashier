"""Settings serializers matching docs/api/openapi.yaml."""

from typing import Any

from rest_framework import serializers

from .models import Settings


class SettingsSerializer(serializers.ModelSerializer[Settings]):
    class Meta:
        model = Settings
        fields = ("business_name", "receipt_footer")
        read_only_fields = fields


class SettingsUpdateSerializer(serializers.Serializer[Any]):
    business_name = serializers.CharField(min_length=1, max_length=80, required=False)
    receipt_footer = serializers.CharField(max_length=200, required=False, allow_blank=True)
