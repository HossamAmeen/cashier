from django.db import models
from django.db.models import Q


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "CASH"
    CARD = "CARD", "CARD"


class Payment(models.Model):
    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.RESTRICT,
        related_name="payment",
    )
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    amount_due_minor = models.BigIntegerField()
    amount_received_minor = models.BigIntegerField()
    change_minor = models.BigIntegerField(default=0)
    paid_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "payments"
        constraints = [
            models.CheckConstraint(
                check=Q(amount_due_minor__gte=0),
                name="payment_amount_due_non_negative",
            ),
            models.CheckConstraint(
                check=Q(amount_received_minor__gte=0),
                name="payment_amount_received_non_negative",
            ),
            models.CheckConstraint(
                check=Q(change_minor__gte=0),
                name="payment_change_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"Payment for Order #{self.order.number} ({self.method})"


class IdempotencyKey(models.Model):
    key = models.CharField(max_length=255, unique=True, db_index=True)
    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE)
    request_hash = models.CharField(max_length=64)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "idempotency_keys"
