from django.db import models

from apps.users.models import User
from common.models import BaseModel


class ShiftStatus(models.TextChoices):
    OPEN = "OPEN", "OPEN"
    CLOSED = "CLOSED", "CLOSED"


class Shift(BaseModel):
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name="shifts")
    status = models.CharField(
        max_length=20, choices=ShiftStatus.choices, default=ShiftStatus.OPEN
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_balance_minor = models.BigIntegerField(default=0)

    # Snapshot fields stored when shift is closed (null while OPEN)
    sales_total_minor_snapshot = models.BigIntegerField(null=True, blank=True)
    cash_total_minor_snapshot = models.BigIntegerField(null=True, blank=True)
    card_total_minor_snapshot = models.BigIntegerField(null=True, blank=True)
    orders_count_snapshot = models.IntegerField(null=True, blank=True)
    counted_cash_minor = models.BigIntegerField(null=True, blank=True)
    difference_minor = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "shifts"
        ordering = ["-opened_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["cashier"],
                condition=models.Q(status="OPEN"),
                name="uniq_open_shift_per_cashier",
            ),
            models.CheckConstraint(
                condition=models.Q(opening_balance_minor__gte=0),
                name="shift_opening_balance_positive",
            ),
        ]

    @property
    def code(self) -> str:
        return f"SH-{str(self.id).zfill(4)}"

    def __str__(self) -> str:
        return f"Shift {self.code} ({self.cashier.name}) [{self.status}]"
