# Simple POS — Business Rules (SOURCE OF TRUTH)

> **Status:** v1.3 — MVP (Gate A approved 2026-09-29; Gate B approved 2026-09-29)
> **Owner:** product-analyst agent. Only the product-analyst may edit this file, and only after the human owner approves the change.
> **Precedence:** `BUSINESS_RULES.md` > `docs/api/openapi.yaml` > `docs/design/Simple-POS-MVP-UIUX-Proposal.pdf` > code.
> If code, tests, or UI disagree with this file, **this file wins** and the other artifact gets fixed.
> Every rule has a stable ID (`BR-…`). Code comments, tests, commits and bug reports must cite IDs.

---

## 0. Scope

The MVP contains exactly these modules: **Auth, Users, Cashiers, Tables, Categories/Items, Orders, Payments, Shifts, basic dashboards, order history, shift history.**

These are **out of scope**, and building them anyway is a defect:
- accounting
- inventory/stock
- suppliers
- purchasing
- loyalty
- advanced reports/charts
- third-party integrations
- split payments
- multi-branch
- offline order creation

---

## 1. Global conventions

| ID | Rule |
|---|---|
| BR-GEN-01 | All money is stored and computed as **integer minor units** (piastres; 1 EGP = 100). No floating point anywhere in money logic. Display uses 2 decimals and the currency label `ج.م`. |
| BR-GEN-02 | Timestamps are stored in UTC. They are displayed in `Africa/Cairo`. A "day" (for "today" filters and dashboards) is a Cairo calendar day. |
| BR-GEN-03 | The server is the only authority for every calculation (totals, change, expected cash, difference). The client may show previews, but the server response always wins. |
| BR-GEN-04 | Records that were ever referenced by an order or shift are **never hard-deleted**. They are disabled instead (see per-entity rules). |
| BR-GEN-05 | UI language is Arabic, RTL. Numbers use Western digits (0-9). |
| BR-GEN-06 | Every rejected operation returns a stable error code (section 9). The UI maps each code to an Arabic message. |

---

## 2. Entities

| Entity | Key fields | Notes |
|---|---|---|
| **User** | id, name (1–100 chars), username (unique, case-insensitive, `[a-z0-9._]{3,32}`), password_hash, role `ADMIN\|CASHIER`, status `ACTIVE\|DISABLED`, last_login_at | A **Cashier** is a User with role CASHIER. There is no separate cashier table; the Cashiers screens are a projection of users + shifts. |
| **Category** | id, name (unique, 1–50 chars), sort_order (int), status `ACTIVE\|DISABLED`, icon (optional; null or a key from a fixed built-in set) | Icon rules: BR-ITEM-07 (OQ-33). |
| **Item** | id, category_id, name (unique within category, 1–80 chars), price_minor (> 0), description (≤ 500 chars), status `ACTIVE\|DISABLED` | |
| **Table** | id, number (unique positive int), is_active (bool) | Occupancy is **derived**, never stored (BR-TBL-01). |
| **Shift** | id, cashier_id, status `OPEN\|CLOSED`, opened_at, opening_balance_minor (≥ 0), closed_at, counted_cash_minor, expected_cash_minor, difference_minor, plus snapshot totals | |
| **Order** | id, number (global sequence starting at 1001), type `DINE_IN\|TAKEAWAY`, table_id (required iff DINE_IN), cashier_id, shift_id, status `OPEN\|PAID\|CANCELLED`, subtotal_minor, discount_minor, total_minor, created_at, paid_at, cancelled_at, cancel_reason (3–200 chars after trimming; BR-ORD-09) | |
| **OrderLine** | id, order_id, item_id, item_name_snapshot, unit_price_snapshot_minor, qty (int 1–999; BR-ORD-02), note (≤ 140 chars), line_total_minor | |
| **Payment** | id, order_id (unique — exactly one payment per order), method `CASH\|CARD`, amount_due_minor, amount_received_minor, change_minor, paid_at, cashier_id, shift_id | |
| **Settings** | business_name (non-empty text, 1–80 chars), receipt_footer (text, 0–200 chars, may be empty) | **Singleton**: exactly one record. Rules: BR-SET-01..03 (OQ-7). |

Every entity above also has `created_at`, set by the server in UTC and never changed afterwards (OQ-35). It is used for display (e.g. the user "تاريخ الإضافة") and for history filters. It carries no other business behavior.

**Length and range limits (Gate B, OQ-41).** The limits written in the table above are inclusive and count characters. A value outside its limit is rejected with `VALIDATION_ERROR` and nothing is saved. Where a field is trimmed (business_name, cancel_reason), the limit applies to the trimmed value.

---

## 3. Roles & permissions

| ID | Rule |
|---|---|
| BR-ROLE-01 | **ADMIN** may manage users, cashiers, tables, categories, items, and Settings (BR-SET-02). ADMIN may view all orders, all shifts, and shift summaries. |
| BR-ROLE-02 | **ADMIN** may NOT open shifts, create or edit orders, take payments, or cancel orders. |
| BR-ROLE-03 | **CASHIER** may log in, open and close **their own** shift, view tables, create/edit/cancel orders, and take payments. |
| BR-ROLE-04 | A CASHIER sees only the orders and shifts they own in history screens. |
| BR-ROLE-05 | Permissions are enforced **on the server** for every endpoint. Hiding a button in the UI is not enforcement. |
| BR-ROLE-06 | A CASHIER can only mutate orders they created. Another cashier's open order on a table is **read-only** for them. A CASHIER may read another cashier's order **only while its status is OPEN**. Reading another cashier's PAID or CANCELLED order → `FORBIDDEN_ROLE` (Gate B, OQ-45). |

---

## 4. Auth & users

| ID | Rule |
|---|---|
| BR-AUTH-01 | Login uses username + password. On failure, return the generic `INVALID_CREDENTIALS` (never reveal which field was wrong). |
| BR-AUTH-02 | A DISABLED user cannot log in (`USER_DISABLED`). Disabling a user revokes their active sessions immediately. |
| BR-AUTH-03 | Login is rate-limited to 5 failed attempts per username+IP per 5 minutes (`TOO_MANY_ATTEMPTS`). |
| BR-AUTH-04 | After login, the user is routed by role: CASHIER → Cashier Dashboard (screen 02), ADMIN → Admin Dashboard (screen 20). |
| BR-USR-01 | Passwords are at least 8 characters and are stored as argon2id or bcrypt hashes. In edit mode, an empty password field means "unchanged". |
| BR-USR-02 | Users are never deleted, only disabled (BR-GEN-04). |
| BR-USR-03 | A cashier with an OPEN shift cannot be disabled (`USER_HAS_OPEN_SHIFT`). |
| BR-USR-04 | The system must always keep **at least one ACTIVE ADMIN**. Disabling or demoting the last one is rejected (`LAST_ADMIN`). |
| BR-USR-05 | A user's role cannot be changed while that user has an OPEN shift (`USER_HAS_OPEN_SHIFT`). |

---

## 5. Shifts

| ID | Rule |
|---|---|
| BR-SHIFT-01 | A cashier can have **at most one** OPEN shift. This is enforced by a DB partial unique index on (cashier_id) WHERE status = 'OPEN'. A second open attempt returns `SHIFT_ALREADY_OPEN`. |
| BR-SHIFT-02 | Opening a shift requires opening_balance ≥ 0. `opened_at` is the server time; the client cannot set it. |
| BR-SHIFT-03 | A cashier must have an OPEN shift to create, edit, cancel, or pay orders (`NO_OPEN_SHIFT`). |
| BR-SHIFT-04 | A shift **cannot close while it has any OPEN order** (`SHIFT_HAS_OPEN_ORDERS`). The response lists those order numbers. |
| BR-SHIFT-05 | Shift totals count **PAID orders only**:<br>• `sales_total` = Σ total of PAID orders<br>• `cash_total` = Σ total of PAID orders paid by CASH (the order total, not the amount received)<br>• `card_total` = Σ total of PAID orders paid by CARD<br>• `orders_count` = count of PAID orders<br>CANCELLED orders are excluded from all totals. |
| BR-SHIFT-06 | `expected_cash` = opening_balance + cash_total. |
| BR-SHIFT-07 | On close, the cashier enters `counted_cash` (≥ 0). `difference` = counted_cash − expected_cash. A negative difference is a shortage (عجز); a positive one is a surplus (زيادة). |
| BR-SHIFT-08 | Closing a shift stores a snapshot of all totals from BR-SHIFT-05..07 and becomes **immutable**. A CLOSED shift can never reopen. |
| BR-SHIFT-09 | Closing the shift shows the final summary and then logs the cashier out. |
| BR-SHIFT-10 | The UI requires confirmation dialogs before both open and close. The server does not depend on those dialogs. |

---

## 6. Tables

| ID | Rule |
|---|---|
| BR-TBL-01 | A table is **OCCUPIED** iff an order with status OPEN references it. Otherwise it is **AVAILABLE**. This is derived and never stored. |
| BR-TBL-02 | At most one OPEN order per table. This is enforced by a DB partial unique index on (table_id) WHERE status = 'OPEN'. Violations return `TABLE_OCCUPIED`. |
| BR-TBL-03 | Only an AVAILABLE, active table can receive a new DINE_IN order. |
| BR-TBL-04 | An OCCUPIED table shows its current order: number, item count (Σ qty), and total. |
| BR-TBL-05 | A table becomes AVAILABLE automatically when its order becomes PAID or CANCELLED. There is no separate "close table" operation; the "إغلاق الطاولة" button goes to payment. |
| BR-TBL-06 | Table numbers are unique. An OCCUPIED table cannot be deactivated or renumbered (`TABLE_OCCUPIED`). Inactive tables are hidden from cashiers. |

---

## 7. Categories & items

| ID | Rule |
|---|---|
| BR-ITEM-01 | Only ACTIVE items in ACTIVE categories appear on the Create Order screen and can be added to orders (`ITEM_INACTIVE`). |
| BR-ITEM-02 | Price must be > 0, with at most 2 decimals in input. It is stored as minor units. |
| BR-ITEM-03 | Changing an item's price or name does **not** affect existing order lines, which keep their snapshots. |
| BR-ITEM-04 | An item referenced by any order line cannot be deleted; it can only be disabled (`ITEM_IN_USE`). An item never used may be hard-deleted. |
| BR-ITEM-05 | A category that contains items cannot be deleted (`CATEGORY_NOT_EMPTY`). It can be disabled, which hides all its items from ordering. |
| BR-ITEM-06 | Categories are shown on the order screen in ascending sort_order, then by name. |
| BR-ITEM-07 | A category's `icon` is optional. When set, it must be a key from the fixed built-in icon set; any other value → `VALIDATION_ERROR`. Image upload does not exist. Items have no icon field: an item shows its category's icon, or a generic icon when the category's icon is null. (OQ-33) The fixed set is exactly these 20 keys (Gate B, OQ-43; mirrored by `CategoryIcon` in openapi.yaml): `coffee`, `tea`, `juice`, `soft_drink`, `water`, `breakfast`, `sandwich`, `burger`, `pizza`, `grill`, `chicken`, `pasta`, `rice`, `salad`, `soup`, `appetizer`, `dessert`, `cake`, `ice_cream`, `bakery`. |

---

## 7a. Settings

| ID | Rule |
|---|---|
| BR-SET-01 | Exactly one Settings record exists (singleton), created by the seed with receipt_footer = "شكرًا لزيارتكم". There is no create or delete operation. business_name is trimmed and must be 1–80 characters; receipt_footer is 0–200 characters. Any other value → `VALIDATION_ERROR`. (OQ-7, OQ-41) |
| BR-SET-02 | Only ADMIN may update Settings; any other caller → `FORBIDDEN_ROLE`. Any authenticated user may read Settings, because the receipt uses them (BR-PAY-07). The admin edits them on the "الإعدادات" screen, which is outside PDF screens 01–20 (OQ-7). |
| BR-SET-03 | Currency is not a setting. It is fixed to EGP with the label `ج.م` (BR-GEN-01). No logo upload exists in the MVP. (OQ-2, OQ-7) |

---

## 8. Orders & payments

| ID | Rule |
|---|---|
| BR-ORD-01 | An order is created only on **"تأكيد الطلب"**. Before that, the cart is client-side state. A created order starts with status OPEN. |
| BR-ORD-02 | An order must have ≥ 1 line (`ORDER_EMPTY`). Quantity per line is an integer from 1 to 999; any other value → `VALIDATION_ERROR` (OQ-41). Reducing quantity to 0 removes the line. |
| BR-ORD-03 | Each order belongs to exactly one cashier (its creator) and to that cashier's OPEN shift at creation time. |
| BR-ORD-04 | DINE_IN orders require an available table (BR-TBL-03). TAKEAWAY orders ("سفري") have no table. |
| BR-ORD-05 | Adding the same item twice merges into one line (qty += 1) **if the notes are equal**. Otherwise it creates a separate line. |
| BR-ORD-06 | Order calculations:<br>• `line_total` = unit_price_snapshot × qty<br>• `subtotal` = Σ line_total<br>• `total` = subtotal − discount |
| BR-ORD-07 | The discount is a **fixed amount** with 0 ≤ discount ≤ subtotal (`DISCOUNT_INVALID`). If the UI offers a percentage, it converts it to an amount (rounded half-up to a whole minor unit) before sending. |
| BR-ORD-08 | Only OPEN orders can be edited (lines, qty, notes, discount) or cancelled (`ORDER_NOT_EDITABLE`). PAID and CANCELLED are terminal states. |
| BR-ORD-09 | Cancelling requires confirmation and a reason (free text, 3–200 chars after trimming; otherwise `VALIDATION_ERROR`, OQ-41). Cancelled orders remain in history with status CANCELLED. |
| BR-ORD-10 | The order number is a global, gap-tolerant sequence starting at 1001, displayed as `#1048`. |
| BR-PAY-01 | Supported payment methods are **CASH** and **CARD** only. Each order has exactly one payment; no split payments. |
| BR-PAY-02 | CASH: amount_received ≥ total (`INSUFFICIENT_CASH`), and change = amount_received − total. |
| BR-PAY-03 | CARD: amount_received = total and change = 0. The server does not accept a received amount for CARD. |
| BR-PAY-04 | Payment runs in **one DB transaction**, which:<br>1. locks the order row<br>2. verifies the order is OPEN and belongs to the caller's open shift<br>3. inserts the Payment<br>4. sets the order to PAID with paid_at<br>The endpoint is idempotent by `Idempotency-Key` header. A double submit must never create two payments. Reusing a key with a different request body → `IDEMPOTENCY_CONFLICT`. |
| BR-PAY-05 | After payment succeeds, the table becomes AVAILABLE (derived, per BR-TBL-05). The success screen shows number, total, method, and time. |
| BR-PAY-06 | Receipt printing uses the browser print dialog with an 80 mm receipt layout. There is no printer driver integration in the MVP. |
| BR-PAY-07 | The receipt is titled **"إيصال"**. It contains no tax wording and no tax lines (OQ-1, OQ-8). In order, it shows: Settings.business_name; order number; table number or "سفري"; paid date and time (Cairo); cashier name; lines (name snapshot × qty, line total); subtotal; discount; total; payment method; for CASH, amount received and change; Settings.receipt_footer (OQ-9). Printing is offered only on screen 14; there is no reprint later (OQ-10). |

---

## 9. Error codes (API → Arabic UI message)

| Code | HTTP | Arabic message |
|---|---|---|
| INVALID_CREDENTIALS | 401 | اسم المستخدم أو كلمة المرور غير صحيحة |
| USER_DISABLED | 403 | هذا الحساب معطّل، تواصل مع المدير |
| TOO_MANY_ATTEMPTS | 429 | محاولات كثيرة، حاول بعد 5 دقائق |
| FORBIDDEN_ROLE | 403 | ليس لديك صلاحية لهذا الإجراء |
| SHIFT_ALREADY_OPEN | 409 | لديك وردية مفتوحة بالفعل |
| NO_OPEN_SHIFT | 409 | يجب فتح وردية أولًا |
| SHIFT_HAS_OPEN_ORDERS | 409 | لا يمكن إغلاق الوردية مع وجود طلبات غير مكتملة |
| TABLE_OCCUPIED | 409 | الطاولة مشغولة بطلب آخر |
| TABLE_INACTIVE | 409 | الطاولة غير متاحة |
| ITEM_INACTIVE | 409 | هذا الصنف غير متاح حاليًا |
| ORDER_EMPTY | 422 | أضف صنفًا واحدًا على الأقل |
| ORDER_NOT_EDITABLE | 409 | لا يمكن تعديل طلب مدفوع أو ملغي |
| NOT_ORDER_OWNER | 403 | هذا الطلب يخص كاشير آخر |
| DISCOUNT_INVALID | 422 | قيمة الخصم غير صحيحة |
| INSUFFICIENT_CASH | 422 | المبلغ المستلم أقل من المطلوب |
| ITEM_IN_USE | 409 | الصنف مستخدم في طلبات سابقة، يمكنك تعطيله فقط |
| CATEGORY_NOT_EMPTY | 409 | لا يمكن حذف تصنيف يحتوي على أصناف |
| USER_HAS_OPEN_SHIFT | 409 | المستخدم لديه وردية مفتوحة |
| LAST_ADMIN | 409 | يجب وجود مدير نشط واحد على الأقل |
| VALIDATION_ERROR | 422 | تحقق من البيانات المدخلة |
| UNAUTHENTICATED | 401 | انتهت الجلسة، سجّل الدخول مرة أخرى |
| NOT_FOUND | 404 | العنصر غير موجود |
| DUPLICATE_VALUE | 409 | القيمة مستخدمة بالفعل |
| IDEMPOTENCY_CONFLICT | 409 | طلب مكرر ببيانات مختلفة |
| INTERNAL_ERROR | 500 | حدث خطأ غير متوقع، حاول مرة أخرى |

When the codes added in v1.2 and v1.3 apply (OQ-40, OQ-42, OQ-44):
- `UNAUTHENTICATED`: any endpoint except login, called with a missing, invalid, expired or revoked session.
- `NOT_FOUND`: a referenced resource id does not exist. This covers an id in the URL path **and** an id in the request body, e.g. `table_id`, `item_id` or `category_id` (Gate B, OQ-44).
- `DUPLICATE_VALUE`: a uniqueness constraint from §2 is violated. These are username (case-insensitive), category name, item name within its category, and table number.
- `IDEMPOTENCY_CONFLICT`: an `Idempotency-Key` is reused with a different request body (BR-PAY-04).
- A cancel reason under 3 characters (BR-ORD-09) and all other format or range failures stay `VALIDATION_ERROR`. This includes the length and range limits in §2 (OQ-41).
- `INTERNAL_ERROR`: an unexpected server failure (HTTP 500). It is a technical code, not a business rejection, and no business rule may use it to reject a request (Gate B, OQ-42).

**UI-only message (not a server code; Gate B, OQ-42).** When the device has no network connection, the UI shows the banner "لا يوجد اتصال بالإنترنت — لا يمكن تنفيذ العمليات حتى يعود الاتصال". Nothing is queued for later: offline order creation is out of scope (§0).

---

## 10. State machines

```
Shift:  (none) --open--> OPEN --close [no OPEN orders]--> CLOSED   (terminal)
Order:  (cart) --confirm--> OPEN --pay--> PAID                     (terminal)
                              \--cancel--> CANCELLED               (terminal)
Table:  AVAILABLE <--(derived from OPEN order existence)--> OCCUPIED
User:   ACTIVE <--> DISABLED   (blocked by BR-USR-03/04)
```

---

## 11. Acceptance scenarios (QA must automate all of these, on the server)

**AC-01 Golden path (numbers are normative).**
Cashier `ahmed.cashier` opens a shift with opening balance 500.00. On table 5 he adds:
- Cappuccino 45.00 × 2
- Beef burger 120.00 × 1
- Cheesecake 65.00 × 1
- Orange juice 40.00 × 1

Expected so far:
- subtotal = 315.00
- after discount 15.00, total = 300.00
- confirming makes table 5 OCCUPIED, showing 5 items and total 300 (subtotal 315, discount 15). The table card displays 300.00 (BR-TBL-04, OQ-14).

He pays CASH, receiving 350.00. Expected:
- change = 50.00
- order is PAID
- table 5 is AVAILABLE

**AC-02 Shift close math.**
Shift has opening balance 500.00, cash_total 3,120.00, card_total 1,730.00. The cashier counts 3,600.00. Expected:
- expected_cash = 3,620.00
- difference = −20.00 (shortage)
- after close, the shift is immutable

**AC-03 Guard rails.**
- A second open shift → `SHIFT_ALREADY_OPEN`.
- Creating an order with no shift → `NO_OPEN_SHIFT`.
- Closing a shift with an OPEN order → `SHIFT_HAS_OPEN_ORDERS`.

**AC-04 Table concurrency.** Two cashiers confirm an order on the same available table simultaneously. Exactly one succeeds; the other gets `TABLE_OCCUPIED`.

**AC-05 Paid is final.** Editing or cancelling a PAID order → `ORDER_NOT_EDITABLE`.

**AC-06 Cancel.** A cancelled order stays in history as CANCELLED, frees the table, and is excluded from shift totals.

**AC-07 Double pay.** Two payment requests with the same Idempotency-Key produce one payment. Two requests with different keys → the second gets `ORDER_NOT_EDITABLE`.

**AC-08 Cash validation.** Received amount < total → `INSUFFICIENT_CASH`. CARD payment → change = 0.

**AC-09 Snapshots.** An admin changes the Cappuccino price to 50.00. The existing OPEN/PAID order lines still show 45.00. New orders use 50.00.

**AC-10 Catalog.**
- A disabled item is not orderable (`ITEM_INACTIVE`).
- Deleting a used item → `ITEM_IN_USE`.
- Deleting a non-empty category → `CATEGORY_NOT_EMPTY`.

**AC-11 RBAC.**
- An admin cannot open a shift or create an order (`FORBIDDEN_ROLE`).
- A cashier cannot call `/users` (`FORBIDDEN_ROLE`).
- A cashier cannot mutate another cashier's order (`NOT_ORDER_OWNER`).

**AC-12 Users.**
- Disabling a cashier with an open shift → `USER_HAS_OPEN_SHIFT`.
- Disabling the last admin → `LAST_ADMIN`.
- A disabled user cannot log in.

**AC-13 Login throttle.** The 6th failed login within 5 minutes → `TOO_MANY_ATTEMPTS`.

**AC-14 Speed.** From the Tables screen, a 2-item order on an available table is confirmed in ≤ 5 taps/clicks.

**AC-15 RTL.** Every one of the 20 screens renders with `dir="rtl"`, has no horizontal scroll at 1280×800 and 1024×768, and all touch targets are ≥ 44 px.

---

## 12. Decided questions (Gate A — DECIDED 2026-09-29)

**Status: DECIDED.** On 2026-09-29 the owner approved Gate A and accepted every default below unchanged. For the ⚠ items (OQ-7, OQ-8, OQ-12, OQ-33, OQ-40), option (a) was approved. Each row is now a **binding decision** with the same force as a rule. Cite it as "OQ-n". Where a decision required a rule change, the rule was edited in v1.2 and is cited in the row. Full detail (options, references, owner decision, dates) is in `docs/product/open-questions.md`, which mirrors this table.

| # | Question | Decision (approved 2026-09-29) |
|---|---|---|
| OQ-1 | Tax/VAT on receipts? | No tax in MVP (BR-PAY-07). |
| OQ-2 | Business name and logo on the receipt? | business_name from Settings; no logo (BR-SET-01..03, BR-PAY-07). |
| OQ-3 | May an ADMIN force-close a cashier's shift? | No (not in MVP). |
| OQ-4 | Login by username only, or also by email (the PDF label mentions email)? | Username only. |
| OQ-5 | Behavior of "نسيت كلمة المرور؟"? | Static hint to contact the admin. No self-service reset. |
| OQ-6 | Meaning of "تذكرني على هذا الجهاز"? | Checked = 7-day persistent session; unchecked = ends when the browser closes. |
| OQ-7 | ⚠ Settings screen/entity (the nav shows it; not among screens 01–20; no entity)? Configurable currency? | (a): minimal Settings (business_name, receipt footer), ADMIN only. Currency is fixed to EGP (BR-GEN-01). No logo upload. → §2 Settings, BR-SET-01..03. |
| OQ-8 | ⚠ The receipt title "فاتورة ضريبية مبسطة" contradicts OQ-1? | (a): title "إيصال"; no tax wording. → BR-PAY-07. |
| OQ-9 | Receipt fields? | Business name, order #, table/سفري, date & time, cashier, lines, subtotal, discount, total, method, received/change, footer. → BR-PAY-07. |
| OQ-10 | Reprint receipts later? | No; print only from screen 14. → BR-PAY-07. |
| OQ-11 | Cashier history: own orders (all shifts) or the current shift only? | Own orders, all shifts (BR-ROLE-04). |
| OQ-12 | ⚠ Shift list and closed-shift summary screens (not in 01–20)? | (a): reuse the screen 17 table for the admin shift list and a read-only screen 05 layout for the closed-shift summary. The cashier UI shows the current shift only; the API lets a cashier read their own shifts (BR-ROLE-04). |
| OQ-13 | Cashier "الحساب" page? | Read-only profile + logout. |
| OQ-14 | Table card shows the subtotal or the total after discount? | Total after discount (BR-TBL-04). AC-01 wording clarified in v1.2. |
| OQ-15 | Dashboard KPI definitions (orders count, today's sales)? | Shift screens: PAID count + OPEN count separately. Admin: sales by paid_at today; orders = all created today. |
| OQ-16 | Timestamp for history filters; week start? | created_at; sales by paid_at; week starts Saturday (Cairo). |
| OQ-17 | Takeaway order entry point? | A "طلب سفري" action on screens 06/02, plus "طلب جديد" on 14. |
| OQ-18 | Move an OPEN order to another table or change its type? | No. |
| OQ-19 | Discount cap, reason or approval? | None beyond BR-ORD-07. |
| OQ-20 | An edit makes the subtotal < the discount? | Reject `DISCOUNT_INVALID`; no auto-clamp. |
| OQ-21 | Merge a re-added item whose price snapshot differs? | Merge only if item, note and price snapshot are equal. |
| OQ-22 | A price change or disable between the client cart and confirm? | Server price/status at confirm; disabled → `ITEM_INACTIVE`. |
| OQ-23 | An item is disabled while on an OPEN order? | Existing lines stay payable; no increase or re-add. |
| OQ-24 | Label for OPEN orders: "مفتوح" or "بانتظار الدفع"? | "مفتوح". |
| OQ-25 | Handover or payment of another cashier's OPEN order? | Not allowed (BR-ROLE-06). |
| OQ-26 | Refunds or payment corrections after PAID? | None in the MVP. |
| OQ-27 | Precision and bounds of cash inputs? | ≤ 2 decimals, ≥ 0, no cap. |
| OQ-28 | Capture a CARD reference? | No. |
| OQ-29 | Logout with an OPEN shift; multiple sessions? | Allowed; the shift stays OPEN. |
| OQ-30 | USER_DISABLED disclosure; throttle reset? | USER_DISABLED only after a correct password; success resets the counter. |
| OQ-31 | Username editable? Does a password change revoke sessions? | Yes / yes. |
| OQ-32 | Delete never-used tables? Zones? | No delete; no zones. |
| OQ-33 | ⚠ Category/item icons (no entity field)? | (a): optional category icon from a fixed set; items inherit it; no uploads. → §2 Category, BR-ITEM-07. |
| OQ-34 | Money and time display format (the PDF shows whole numbers)? | 2 decimals everywhere + thousands separator; 12-hour ص/م; DD/MM/YYYY. |
| OQ-35 | Shift code, history range, user created date? | "SH-"+4-digit id; last 30 days; created_at on all entities (§2). |
| OQ-36 | Zero-difference label; reason for a shortage? | "مطابق"; no reason. |
| OQ-37 | An admin disables or demotes themselves? | Allowed subject to BR-USR-04. |
| OQ-38 | Concurrent shifts sharing one drawer? | One drawer per cashier assumed. |
| OQ-39 | A shift open past midnight? | No auto-close. |
| OQ-40 | ⚠ Missing §9 codes (401, 404, duplicates, idempotency conflict)? | (a): `UNAUTHENTICATED`, `NOT_FOUND`, `DUPLICATE_VALUE`, `IDEMPOTENCY_CONFLICT` added to §9. A short cancel reason stays `VALIDATION_ERROR`. |

**Gate B — DECIDED 2026-09-29.** The owner approved the API contract. These questions were raised in the contract review (`docs/api/contract-review.md`) and are binding like the rows above.

| # | Question | Decision (approved 2026-09-29, Gate B) |
|---|---|---|
| OQ-41 | Text-length and quantity limits missing from BR? | business_name 1–80, receipt_footer 0–200, user name 1–100, category name 1–50, item name 1–80, cancel reason 3–200 (trimmed), qty per line 1–999. A value outside a limit → `VALIDATION_ERROR`. → §2, BR-SET-01, BR-ORD-02, BR-ORD-09. |
| OQ-42 | Code and message for an unexpected server error? Offline message? | `INTERNAL_ERROR` 500 "حدث خطأ غير متوقع، حاول مرة أخرى" added to §9. The UI-only offline banner is recorded in §9. |
| OQ-43 | Contents of the fixed category icon set (BR-ITEM-07)? | The team-lead's 20 keys, listed in BR-ITEM-07. |
| OQ-44 | Unknown id in the request body: `VALIDATION_ERROR` or `NOT_FOUND`? | `NOT_FOUND` (404), for path and body ids alike. → §9. |
| OQ-45 | May a CASHIER read another cashier's order outside the tables flow? | Only while it is OPEN. Otherwise → `FORBIDDEN_ROLE`. → BR-ROLE-06. |
| OQ-46 | Error codes for edge cases in the contract defaults (Gate B D1, D5, D6)? | A CASHIER reading another cashier's shift, or passing another cashier's `cashier_id` or `shift_id` as a filter → `FORBIDDEN_ROLE`. Closing an already CLOSED shift → `NO_OPEN_SHIFT`. The receipt of an order that is not PAID → `NOT_FOUND`. Every 429 → `TOO_MANY_ATTEMPTS`. |

---

## Changelog
- v1.0 — Initial rules derived from the UI/UX proposal PDF.
- v1.1 — 2026-09-28 — product-analyst (P1-01): §12 extended with OQ-4…OQ-40, found while mapping the UI/UX PDF to user stories (see docs/product/open-questions.md and gaps-and-contradictions.md). Open questions only: no rule in §0–§11 was added, removed or changed. Pending owner decisions at Gate A.
- v1.2 — 2026-09-29 — product-analyst (P1-02): **Gate A approved by the owner on 2026-09-29**, accepting all defaults for OQ-1…OQ-40 unchanged (option (a) for ⚠ OQ-7, OQ-8, OQ-12, OQ-33, OQ-40). §12 marked DECIDED. Rule edits: §2 adds the Settings singleton entity, the optional Category `icon`, and `created_at` on all entities. BR-ROLE-01 adds Settings to ADMIN scope. New BR-ITEM-07 (category icon). New §7a with BR-SET-01..03 (Settings). BR-PAY-04 adds `IDEMPOTENCY_CONFLICT`. New BR-PAY-07 (receipt title "إيصال" and content). §9 adds `UNAUTHENTICATED`, `NOT_FOUND`, `DUPLICATE_VALUE` and `IDEMPOTENCY_CONFLICT`, plus when each applies. AC-01 table-card wording clarified. No existing ID was renumbered or removed.
- v1.3 — 2026-09-29 — product-analyst (P2-03): **Gate B approved by the owner on 2026-09-29** (as relayed by the coordinator), deciding D2, D3 and D4 of the contract review and accepting its two major clarifications. §2 adds length and range limits: user name, category name, item name, cancel_reason, qty 1–999, and the Settings fields (OQ-41). BR-SET-01, BR-ORD-02 and BR-ORD-09 are refined with those limits. BR-ITEM-07 lists the 20 icon keys (OQ-43). BR-ROLE-06: a CASHIER reads another cashier's order only while it is OPEN, else `FORBIDDEN_ROLE` (OQ-45). §9 adds `INTERNAL_ERROR` 500 and the UI-only offline banner (OQ-42), and extends `NOT_FOUND` to ids in the request body (OQ-44). §12 adds the Gate B decisions OQ-41…OQ-46. No ID was renumbered or removed.
