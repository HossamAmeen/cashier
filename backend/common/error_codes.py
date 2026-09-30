"""BR §9 error catalogue (BR-GEN-06). Code → (HTTP status, Arabic message).

This must stay identical to BUSINESS_RULES.md §9 and to the `ErrorCode` enum in docs/api/openapi.yaml;
tests/test_error_catalog.py enforces both.
"""

from enum import StrEnum


class ErrorCode(StrEnum):
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    USER_DISABLED = "USER_DISABLED"
    TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS"
    FORBIDDEN_ROLE = "FORBIDDEN_ROLE"
    SHIFT_ALREADY_OPEN = "SHIFT_ALREADY_OPEN"
    NO_OPEN_SHIFT = "NO_OPEN_SHIFT"
    SHIFT_HAS_OPEN_ORDERS = "SHIFT_HAS_OPEN_ORDERS"
    TABLE_OCCUPIED = "TABLE_OCCUPIED"
    TABLE_INACTIVE = "TABLE_INACTIVE"
    ITEM_INACTIVE = "ITEM_INACTIVE"
    ORDER_EMPTY = "ORDER_EMPTY"
    ORDER_NOT_EDITABLE = "ORDER_NOT_EDITABLE"
    NOT_ORDER_OWNER = "NOT_ORDER_OWNER"
    DISCOUNT_INVALID = "DISCOUNT_INVALID"
    INSUFFICIENT_CASH = "INSUFFICIENT_CASH"
    ITEM_IN_USE = "ITEM_IN_USE"
    CATEGORY_NOT_EMPTY = "CATEGORY_NOT_EMPTY"
    USER_HAS_OPEN_SHIFT = "USER_HAS_OPEN_SHIFT"
    LAST_ADMIN = "LAST_ADMIN"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    NOT_FOUND = "NOT_FOUND"
    DUPLICATE_VALUE = "DUPLICATE_VALUE"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    # Technical (not a business rejection): unexpected server failure. Owner-approved at GATE B (D3); BR §9 v1.3.
    INTERNAL_ERROR = "INTERNAL_ERROR"


# BR §9 — verbatim.
ERROR_CATALOG: dict[ErrorCode, tuple[int, str]] = {
    ErrorCode.INVALID_CREDENTIALS: (401, "اسم المستخدم أو كلمة المرور غير صحيحة"),
    ErrorCode.USER_DISABLED: (403, "هذا الحساب معطّل، تواصل مع المدير"),
    ErrorCode.TOO_MANY_ATTEMPTS: (429, "محاولات كثيرة، حاول بعد 5 دقائق"),
    ErrorCode.FORBIDDEN_ROLE: (403, "ليس لديك صلاحية لهذا الإجراء"),
    ErrorCode.SHIFT_ALREADY_OPEN: (409, "لديك وردية مفتوحة بالفعل"),
    ErrorCode.NO_OPEN_SHIFT: (409, "يجب فتح وردية أولًا"),
    ErrorCode.SHIFT_HAS_OPEN_ORDERS: (409, "لا يمكن إغلاق الوردية مع وجود طلبات غير مكتملة"),
    ErrorCode.TABLE_OCCUPIED: (409, "الطاولة مشغولة بطلب آخر"),
    ErrorCode.TABLE_INACTIVE: (409, "الطاولة غير متاحة"),
    ErrorCode.ITEM_INACTIVE: (409, "هذا الصنف غير متاح حاليًا"),
    ErrorCode.ORDER_EMPTY: (422, "أضف صنفًا واحدًا على الأقل"),
    ErrorCode.ORDER_NOT_EDITABLE: (409, "لا يمكن تعديل طلب مدفوع أو ملغي"),
    ErrorCode.NOT_ORDER_OWNER: (403, "هذا الطلب يخص كاشير آخر"),
    ErrorCode.DISCOUNT_INVALID: (422, "قيمة الخصم غير صحيحة"),
    ErrorCode.INSUFFICIENT_CASH: (422, "المبلغ المستلم أقل من المطلوب"),
    ErrorCode.ITEM_IN_USE: (409, "الصنف مستخدم في طلبات سابقة، يمكنك تعطيله فقط"),
    ErrorCode.CATEGORY_NOT_EMPTY: (409, "لا يمكن حذف تصنيف يحتوي على أصناف"),
    ErrorCode.USER_HAS_OPEN_SHIFT: (409, "المستخدم لديه وردية مفتوحة"),
    ErrorCode.LAST_ADMIN: (409, "يجب وجود مدير نشط واحد على الأقل"),
    ErrorCode.VALIDATION_ERROR: (422, "تحقق من البيانات المدخلة"),
    ErrorCode.UNAUTHENTICATED: (401, "انتهت الجلسة، سجّل الدخول مرة أخرى"),
    ErrorCode.NOT_FOUND: (404, "العنصر غير موجود"),
    ErrorCode.DUPLICATE_VALUE: (409, "القيمة مستخدمة بالفعل"),
    ErrorCode.IDEMPOTENCY_CONFLICT: (409, "طلب مكرر ببيانات مختلفة"),
    # GATE B D3 (owner-approved 2026-09-29); added to BR §9 in v1.3.
    ErrorCode.INTERNAL_ERROR: (500, "حدث خطأ غير متوقع، حاول مرة أخرى"),
}

BUSINESS_CODES: frozenset[ErrorCode] = frozenset(c for c in ErrorCode if c is not ErrorCode.INTERNAL_ERROR)


def http_status(code: ErrorCode) -> int:
    return ERROR_CATALOG[code][0]


def message(code: ErrorCode) -> str:
    return ERROR_CATALOG[code][1]
