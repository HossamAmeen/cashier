from django.db import models
from django.db.models import F, Q


class OrderType(models.TextChoices):
    DINE_IN = "DINE_IN", "DINE_IN"
    TAKEAWAY = "TAKEAWAY", "TAKEAWAY"


class OrderStatus(models.TextChoices):
    OPEN = "OPEN", "OPEN"
    PAID = "PAID", "PAID"
    CANCELLED = "CANCELLED", "CANCELLED"


class Order(models.Model):
    number = models.BigIntegerField(unique=True, db_index=True)
    type = models.CharField(max_length=20, choices=OrderType.choices)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.OPEN, db_index=True)
    table = models.ForeignKey(
        "tables.Table",
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="orders",
    )
    cashier = models.ForeignKey(
        "users.User",
        on_delete=models.RESTRICT,
        related_name="orders",
    )
    shift = models.ForeignKey(
        "shifts.Shift",
        on_delete=models.RESTRICT,
        related_name="orders",
    )
    subtotal_minor = models.BigIntegerField(default=0)
    discount_minor = models.BigIntegerField(default=0)
    total_minor = models.BigIntegerField(default=0)
    notes = models.TextField(blank=True, default="")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.TextField(null=True, blank=True)  # noqa: DJ001
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-number"]
        indexes = [
            models.Index(
                fields=["table"],
                condition=Q(status="OPEN", table__isnull=False),
                name="uniq_open_order_per_table",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(subtotal_minor__gte=0),
                name="order_subtotal_minor_non_negative",
            ),
            models.CheckConstraint(
                check=Q(discount_minor__gte=0),
                name="order_discount_minor_non_negative",
            ),
            models.CheckConstraint(
                check=Q(total_minor__gte=0),
                name="order_total_minor_non_negative",
            ),
            models.CheckConstraint(
                check=Q(discount_minor__lte=F("subtotal_minor")),
                name="order_discount_lte_subtotal",
            ),
            models.CheckConstraint(
                check=(
                    (Q(type="DINE_IN") & Q(table__isnull=False)) |
                    (Q(type="TAKEAWAY") & Q(table__isnull=True))
                ),
                name="order_table_type_consistency",
            ),
        ]

    def __str__(self) -> str:
        return f"Order #{self.number} ({self.status})"


class OrderLine(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        "catalog.Item",
        on_delete=models.RESTRICT,
        related_name="order_lines",
    )
    item_name = models.CharField(max_length=255)
    unit_price_minor = models.BigIntegerField()
    qty = models.IntegerField()
    subtotal_minor = models.BigIntegerField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "order_lines"
        constraints = [
            models.CheckConstraint(
                check=Q(unit_price_minor__gt=0),
                name="orderline_unit_price_positive",
            ),
            models.CheckConstraint(
                check=Q(qty__gte=1, qty__lte=999),
                name="orderline_qty_range",
            ),
            models.CheckConstraint(
                check=Q(subtotal_minor__gt=0),
                name="orderline_subtotal_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.item_name} x {self.qty}"
