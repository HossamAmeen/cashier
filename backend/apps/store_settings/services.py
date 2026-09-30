"""Settings workflows: update_settings (BR-SET-01..03)."""

from typing import Any

from django.db import transaction

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import Settings


def update_settings(**data: Any) -> Settings:
    with transaction.atomic():
        settings_obj = Settings.get_solo()

        if "business_name" in data and data["business_name"] is not None:
            clean_name = str(data["business_name"]).strip()
            if not clean_name:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    details={"fields": {"business_name": ["Business name cannot be blank."]}},
                )
            settings_obj.business_name = clean_name

        if "receipt_footer" in data and data["receipt_footer"] is not None:
            clean_footer = str(data["receipt_footer"]).strip()
            settings_obj.receipt_footer = clean_footer

        settings_obj.save()
        return settings_obj
