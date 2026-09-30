/**
 * BR §9 error code → Arabic UI message (BR-GEN-06). Must equal BUSINESS_RULES.md §9 and the contract's ErrorCode
 * enum; errors.test.ts enforces it.
 */
import type { components } from '@/api/schema';

export type ErrorCode = components['schemas']['ErrorCode'];
/** Client-only code for a request that never reached the server (offline / network failure). */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_CREDENTIALS: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  USER_DISABLED: 'هذا الحساب معطّل، تواصل مع المدير',
  TOO_MANY_ATTEMPTS: 'محاولات كثيرة، حاول بعد 5 دقائق',
  FORBIDDEN_ROLE: 'ليس لديك صلاحية لهذا الإجراء',
  SHIFT_ALREADY_OPEN: 'لديك وردية مفتوحة بالفعل',
  NO_OPEN_SHIFT: 'يجب فتح وردية أولًا',
  SHIFT_HAS_OPEN_ORDERS: 'لا يمكن إغلاق الوردية مع وجود طلبات غير مكتملة',
  TABLE_OCCUPIED: 'الطاولة مشغولة بطلب آخر',
  TABLE_INACTIVE: 'الطاولة غير متاحة',
  ITEM_INACTIVE: 'هذا الصنف غير متاح حاليًا',
  ORDER_EMPTY: 'أضف صنفًا واحدًا على الأقل',
  ORDER_NOT_EDITABLE: 'لا يمكن تعديل طلب مدفوع أو ملغي',
  NOT_ORDER_OWNER: 'هذا الطلب يخص كاشير آخر',
  DISCOUNT_INVALID: 'قيمة الخصم غير صحيحة',
  INSUFFICIENT_CASH: 'المبلغ المستلم أقل من المطلوب',
  ITEM_IN_USE: 'الصنف مستخدم في طلبات سابقة، يمكنك تعطيله فقط',
  CATEGORY_NOT_EMPTY: 'لا يمكن حذف تصنيف يحتوي على أصناف',
  USER_HAS_OPEN_SHIFT: 'المستخدم لديه وردية مفتوحة',
  LAST_ADMIN: 'يجب وجود مدير نشط واحد على الأقل',
  VALIDATION_ERROR: 'تحقق من البيانات المدخلة',
  UNAUTHENTICATED: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  NOT_FOUND: 'العنصر غير موجود',
  DUPLICATE_VALUE: 'القيمة مستخدمة بالفعل',
  IDEMPOTENCY_CONFLICT: 'طلب مكرر ببيانات مختلفة',
  // Technical, not a business rejection (ADR-0010) — owner-approved at GATE B (D3); BR §9 v1.3.
  INTERNAL_ERROR: 'حدث خطأ غير متوقع، حاول مرة أخرى',
};

/** Offline / network failure (ADR-0012) — owner-approved at GATE B (D3). UI only, no API code. */
export const NETWORK_ERROR_MESSAGE = 'لا يوجد اتصال بالإنترنت — لا يمكن تنفيذ العمليات حتى يعود الاتصال';

export function errorMessage(code: ClientErrorCode): string {
  return code === 'NETWORK_ERROR' ? NETWORK_ERROR_MESSAGE : ERROR_MESSAGES[code];
}
