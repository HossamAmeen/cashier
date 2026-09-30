import hashlib
import json
from typing import Any

from django.db import transaction, IntegrityError

from apps.orders.models import Order, OrderStatus
from apps.payments.models import IdempotencyKey, Payment, PaymentMethod
from apps.shifts.models import Shift, ShiftStatus
from common.error_codes import ErrorCode
from common.exceptions import AppError


def _compute_hash(data: Any) -> str:
    body_str = json.dumps(data, sort_keys=True) if isinstance(data, dict) else str(data)
    return hashlib.sha256(body_str.encode("utf-8")).hexdigest()


def pay_order(
    *,
    order_id: int,
    user: Any,
    method: str,
    amount_received_minor: int | None = None,
    idempotency_key: str | None = None,
    payload_data: Any = None,
) -> dict[str, Any]:
    # 1. Role check
    if user.role != "CASHIER":
        raise AppError(ErrorCode.FORBIDDEN_ROLE)

    request_hash = _compute_hash(payload_data or {"method": method, "amount_received_minor": amount_received_minor})

    # 2. Idempotency Key check
    if idempotency_key:
        try:
            ikey_obj = IdempotencyKey.objects.select_related("payment", "payment__order").get(key=idempotency_key)
            if (
                ikey_obj.user_id == user.id
                and ikey_obj.order_id == order_id
                and ikey_obj.request_hash == request_hash
                and ikey_obj.payment
            ):
                return {
                    "payment": ikey_obj.payment,
                    "order": ikey_obj.payment.order,
                }
            raise AppError(ErrorCode.IDEMPOTENCY_CONFLICT)
        except IdempotencyKey.DoesNotExist:
            pass

    with transaction.atomic():
        # 3. Lock Order Row
        try:
            order = (
                Order.objects.select_for_update(of=("self",))
                .select_related("cashier", "shift", "table")
                .prefetch_related("lines")
                .get(pk=order_id)
            )
        except Order.DoesNotExist as err:
            raise AppError(ErrorCode.NOT_FOUND) from err

        # 4. NOT_ORDER_OWNER
        if order.cashier_id != user.id:  # type: ignore[attr-defined]
            raise AppError(ErrorCode.NOT_ORDER_OWNER)

        # 5. NO_OPEN_SHIFT
        shift = Shift.objects.select_for_update().filter(cashier=user, status=ShiftStatus.OPEN).first()
        if not shift:
            raise AppError(ErrorCode.NO_OPEN_SHIFT)

        # 6. ORDER_NOT_EDITABLE
        if order.status != OrderStatus.OPEN:
            raise AppError(ErrorCode.ORDER_NOT_EDITABLE)

        # 7. Payment method calculations
        if method == PaymentMethod.CASH:
            if amount_received_minor is None or amount_received_minor < order.total_minor:
                raise AppError(ErrorCode.INSUFFICIENT_CASH)
            change_minor = amount_received_minor - order.total_minor
            rec_minor = amount_received_minor
        elif method == PaymentMethod.CARD:
            if amount_received_minor is not None and amount_received_minor != order.total_minor:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    details={"amount_received_minor": "Must be omitted or equal to order total for CARD"},
                )
            rec_minor = order.total_minor
            change_minor = 0
        else:
            raise AppError(ErrorCode.VALIDATION_ERROR, details={"method": "Invalid payment method"})

        try:
            payment = Payment.objects.create(
                order=order,
                method=method,
                amount_due_minor=order.total_minor,
                amount_received_minor=rec_minor,
                change_minor=change_minor,
            )
            order.status = OrderStatus.PAID
            order.save()

            if idempotency_key:
                IdempotencyKey.objects.create(
                    key=idempotency_key,
                    user=user,
                    order=order,
                    request_hash=request_hash,
                    payment=payment,
                )
        except IntegrityError as err:
            if idempotency_key and IdempotencyKey.objects.filter(key=idempotency_key).exists():
                raise AppError(ErrorCode.IDEMPOTENCY_CONFLICT) from err
            if hasattr(order, "payment") and order.payment:
                raise AppError(ErrorCode.ORDER_NOT_EDITABLE) from err
            raise

    return {
        "payment": payment,
        "order": order,
    }
