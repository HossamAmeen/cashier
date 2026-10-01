"""Store Settings singleton model (BR-SET-01..03, OQ-7)."""

from typing import ClassVar

from django.db import models

from common.models import BaseModel

BUSINESS_NAME_MAX_LENGTH = 80
RECEIPT_FOOTER_MAX_LENGTH = 200

CHECK_SINGLETON_ID = "store_settings_singleton_id"
CHECK_BUSINESS_NAME_NOT_BLANK = "store_settings_business_name_not_blank"


class Settings(BaseModel):
    """Singleton row for store settings (id=1 constraint)."""

    business_name = models.CharField(max_length=BUSINESS_NAME_MAX_LENGTH, default="كاشيري")
    receipt_footer = models.CharField(max_length=RECEIPT_FOOTER_MAX_LENGTH, default="شكرًا لزيارتكم", blank=True)

    class Meta:
        verbose_name = "Settings"
        verbose_name_plural = "Settings"
        constraints: ClassVar[list[models.BaseConstraint]] = [
            models.CheckConstraint(condition=models.Q(pk=1), name=CHECK_SINGLETON_ID),
            models.CheckConstraint(condition=~models.Q(business_name=""), name=CHECK_BUSINESS_NAME_NOT_BLANK),
        ]

    def __str__(self) -> str:
        return self.business_name

    @classmethod
    def get_solo(cls) -> "Settings":
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                "business_name": "كاشيري",
                "receipt_footer": "شكرًا لزيارتكم",
            },
        )
        return obj
