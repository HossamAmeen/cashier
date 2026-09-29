# Simple POS — User Stories & Acceptance Criteria

> **Owner:** product-analyst · **Version:** 1.0 (Phase 1, task P1-01) · **Date:** 2026-09-28
> **Sources:** `docs/business/BUSINESS_RULES.md` v1.1 (wins on conflict) · `docs/design/Simple-POS-MVP-UIUX-Proposal.pdf` (34 pages; screens 01–20 on pages 8–27, flows on pages 28–30).
> **Conventions**
> - `US-01`…`US-20` map 1:1 to PDF screens 01…20. `US-21`…`US-27` are flows and cross-cutting stories.
> - Every criterion is written Given/When/Then and cites `BR-*` IDs, plus `AC-*` where an acceptance scenario applies. "→ `CODE`" means the server rejects the request with that BR §9 error code, and the UI shows that code's Arabic message.
> - Money in examples is in EGP. It is stored as integer minor units (BR-GEN-01), e.g. 45.00 = 4500.
> - "OQ-n" means the open question in `docs/product/open-questions.md`. Where the default in force for an OQ shapes a criterion, the criterion is tagged `(default OQ-n)` and must be revisited once the owner decides.
> - **Server enforcement:** every business criterion below is enforced by the server (BR-ROLE-05, BR-GEN-03). Hidden or disabled buttons are UX only, and QA must also test the API directly.

---

## US-01 — As a cashier or admin, I want to log in with my username and password so that I reach the part of the system that fits my role.
**Screens:** 01 Login (PDF p.8). Leads to 02 (cashier) and 20 (admin).

**Acceptance criteria**
1. **Given** an ACTIVE CASHIER `ahmed.cashier` with a correct password, **when** they submit login, **then** they are authenticated, `last_login_at` is set, and they land on screen 02. [BR-AUTH-01, BR-AUTH-04]
2. **Given** an ACTIVE ADMIN, **when** they log in successfully, **then** they land on screen 20. [BR-AUTH-04]
3. **Given** a wrong password *or* an unknown username, **when** the user submits, **then** the response is `INVALID_CREDENTIALS` (401) in both cases, with an identical body and message "اسم المستخدم أو كلمة المرور غير صحيحة". The message appears under the form and the username field keeps its value. [BR-AUTH-01, BR-GEN-06]
4. **Given** a user with status DISABLED, **when** they submit correct credentials, **then** the response is `USER_DISABLED` (403). [BR-AUTH-02; AC-12] (default OQ-30: `USER_DISABLED` is returned only after the password has been verified. A wrong password returns `INVALID_CREDENTIALS`.)
5. **Given** 5 failed attempts for the same username+IP within 5 minutes, **when** a 6th attempt is made in that window (even with the correct password), **then** the response is `TOO_MANY_ATTEMPTS` (429). [BR-AUTH-03; AC-13] (default OQ-30: a successful login clears the counter.)
6. **Given** the login form, **when** the user presses the eye icon, **then** the password toggles between hidden and visible. This is UX only. [PDF p.8]
7. **Given** the username field, **when** it is rendered, **then** it is labelled "اسم المستخدم" and accepts only a username. It does not accept an email. [BR-AUTH-01, BR §2 User] (default OQ-4)
8. **Given** the login is case-insensitive on username, **when** `Ahmed.Cashier` is entered, **then** it matches `ahmed.cashier`. [BR §2 User]

**Out of scope / notes**
- Self-service password reset. The "نسيت كلمة المرور؟" link shows a static hint to contact the admin (default OQ-5).
- The meaning of "تذكرني على هذا الجهاز" is pending (OQ-6).
- There is no SSO and no email login.

---

## US-02 — As a cashier, I want a home dashboard that shows my shift status, key numbers and main actions so that I can start and run my day quickly.
**Screens:** 02 Cashier Dashboard (PDF p.9).

**Acceptance criteria**
1. **Given** a cashier with no OPEN shift, **when** screen 02 loads, **then** "فتح وردية" is the prominent primary action leading to screen 03. The shift bar reads "لا توجد وردية مفتوحة". "إغلاق الوردية" is disabled. [BR-SHIFT-03, BR-SHIFT-10; PDF p.9]
2. **Given** a cashier with an OPEN shift, **when** screen 02 loads, **then** the shift bar shows "الوردية مفتوحة", the cashier's name, `opened_at` (Cairo time) and the elapsed duration. "فتح وردية" is disabled with the hint "الوردية مفتوحة بالفعل". [BR-SHIFT-01, BR-GEN-02]
3. **Given** an OPEN shift, **when** the KPI cards render, **then** these values come from the server:
   - "إجمالي مبيعات الوردية" = `sales_total`, with the sub-line "نقدي `cash_total` · بطاقة `card_total`"
   - "عدد الطلبات" = `orders_count` (PAID only), with the sub-line "N طلبات جارية الآن", where N = this cashier's OPEN orders in the shift
   - "الطاولات المتاحة" / "الطاولات المشغولة" = counts over *active* tables, with the occupied tables' Σ total
   
   [BR-SHIFT-05, BR-TBL-01, BR-TBL-04, BR-GEN-03] (default OQ-15)
4. **Given** the KPI rule, **when** an order is CANCELLED, **then** it does not change sales or orders_count. [BR-SHIFT-05; AC-06]
5. **Given** the action "الطاولات", **when** it is pressed, **then** screen 06 opens. "الطلبات الحالية" opens the list of this cashier's OPEN orders. Each card in "الطلبات الجارية" shows `#number`, table (or "سفري"), item count (Σ qty), and total, and opens screen 12. "إغلاق الوردية" opens screen 05. [BR-TBL-04, BR-ORD-10; PDF p.9]
6. **Given** an ADMIN, **when** they request the cashier dashboard, **then** they are routed to screen 20 instead. [BR-AUTH-04]

**Out of scope / notes:** charts; KPIs for other cashiers.

---

## US-03 — As a cashier, I want to open a shift with my opening cash balance so that I can start taking orders and the cash count is correct at the end.
**Screens:** 03 Open Shift, including its confirm dialog (PDF p.10).

**Acceptance criteria**
1. **Given** a cashier with no OPEN shift, **when** screen 03 loads, **then** the cashier's name and start time are shown read-only. The start time is labelled "يُسجَّل تلقائيًا من وقت النظام". [BR-SHIFT-02]
2. **Given** an opening balance input, **when** the cashier types a value or taps a quick amount (0 / 200 / 500 / 1000), **then** the field shows the amount with the label ج.م and accepts at most 2 decimals. [BR-SHIFT-02, BR-GEN-01] (default OQ-27)
3. **Given** a valid balance, **when** "فتح الوردية" is pressed, **then** a confirm dialog shows the cashier, start time and opening balance, with buttons "تأكيد وفتح الوردية" and "رجوع". "رجوع" returns to editing without saving. [BR-SHIFT-10]
4. **Given** the confirm dialog, **when** it is confirmed with 500.00, **then** a shift is created with status OPEN, `opening_balance_minor` = 50000, and `opened_at` = server time. Any client-sent `opened_at` is ignored. The user is taken to screen 06. [BR-SHIFT-02; AC-01]
5. **Given** an opening balance < 0, **when** it is submitted, **then** → `VALIDATION_ERROR`. [BR-SHIFT-02]
6. **Given** the cashier already has an OPEN shift, **when** a second open request is sent (e.g. from another tab), **then** → `SHIFT_ALREADY_OPEN` (409). This is guaranteed by the DB partial unique index even under concurrent requests. [BR-SHIFT-01; AC-03]
7. **Given** an ADMIN, **when** they call open-shift, **then** → `FORBIDDEN_ROLE` (403). [BR-ROLE-02, BR-ROLE-05; AC-11]
8. **Given** no OPEN shift, **when** the cashier tries to create, edit, cancel or pay an order through any route, **then** → `NO_OPEN_SHIFT`. The info banner reads "لا يمكن إنشاء طلبات أو فتح طاولات قبل فتح الوردية". [BR-SHIFT-03; AC-03]

**Out of scope / notes:** an admin opening a shift on someone's behalf; pre-filling the balance from the previous shift.

---

## US-04 — As a cashier, I want to see a live summary of my current shift so that I know my sales and pending orders before closing.
**Screens:** 04 Current Shift (PDF p.11).

**Acceptance criteria**
1. **Given** an OPEN shift, **when** screen 04 loads, **then** it shows: the cashier's name, the "وردية مفتوحة" badge, `opened_at`, duration, opening balance, the count of OPEN orders ("طلبات غير مكتملة"), `orders_count`, `sales_total`, `cash_total` and `card_total`. All values come from the server. [BR-SHIFT-05, BR-GEN-03]
2. **Given** PAID orders of 3,120.00 cash and 1,730.00 card, **when** the payment split bar renders, **then** it shows "نقدي 64% · بطاقة 36%", with percentages rounded to whole numbers from the minor-unit totals. [BR-SHIFT-05]
3. **Given** a CASH order with total 300.00 where 350.00 was received, **when** totals are computed, **then** `cash_total` grows by 300.00. The amount received does not count. [BR-SHIFT-05]
4. **Given** the shift's recent-orders table, **when** it renders, **then** each row shows the number, table or "سفري", total, status badge (OPEN "مفتوح", PAID "مدفوع", CANCELLED "ملغي"), payment method ("—" if unpaid) and time (Cairo). Pressing a row opens screen 12. [BR-GEN-02, BR-ORD-10]
5. **Given** "عرض الطلبات", **when** it is pressed, **then** screen 15 opens filtered to this shift. "إغلاق الوردية" opens screen 05. [PDF p.11]
6. **Given** a cashier, **when** they request another cashier's shift, **then** → `FORBIDDEN_ROLE` (or not-found; see OQ-40). [BR-ROLE-04]
7. **Given** no OPEN shift, **when** the cashier opens "الورديات", **then** they are sent to screen 03. [BR-SHIFT-03] (default OQ-12)

**Out of scope / notes:** charts beyond the single split bar.

---

## US-05 — As a cashier, I want to close my shift by entering the counted cash and seeing the difference so that the drawer is reconciled and the shift is locked.
**Screens:** 05 Close Shift, including its confirm dialog and post-close summary (PDF p.12).

**Acceptance criteria**
1. **Given** an OPEN shift with opening balance 500.00, `cash_total` 3,120.00 and `card_total` 1,730.00, **when** screen 05 loads, **then** it shows `sales_total` 4,850.00 and `expected_cash` 3,620.00, with the formula caption "النقد المتوقع = الرصيد الافتتاحي + المدفوع نقدًا". [BR-SHIFT-05, BR-SHIFT-06; AC-02]
2. **Given** the cashier enters counted cash 3,600.00, **when** the preview updates, **then** the difference reads −20.00 in red, labelled "عجز". A positive difference is labelled "زيادة" in green. Zero is labelled "مطابق" in green. [BR-SHIFT-07; AC-02] (label for zero: default OQ-36)
3. **Given** the shift has ≥ 1 OPEN order, **when** screen 05 loads, **then** "إغلاق الوردية" is disabled with a message listing the open order numbers. **When** the close API is called anyway, **then** → `SHIFT_HAS_OPEN_ORDERS` (409), and the response lists those order numbers. [BR-SHIFT-04; AC-03]
4. **Given** no OPEN orders, **when** screen 05 loads, **then** a success note reads "لا توجد طلبات غير مكتملة — يمكن إغلاق الوردية". [BR-SHIFT-04]
5. **Given** a valid counted cash amount (≥ 0, at most 2 decimals), **when** "إغلاق الوردية" is pressed, **then** a confirm dialog shows expected cash, counted cash and difference, with "تأكيد الإغلاق" and "رجوع". [BR-SHIFT-07, BR-SHIFT-10]
6. **Given** confirmation, **when** the server closes the shift, **then** it stores `closed_at`, `counted_cash_minor`, `expected_cash_minor`, `difference_minor` and snapshots of `sales_total`, `cash_total`, `card_total` and `orders_count`. It recomputes these itself and ignores any client-computed values. [BR-SHIFT-08, BR-GEN-03; AC-02]
7. **Given** a CLOSED shift, **when** anyone tries to reopen it, add orders to it, or change any stored field, **then** the request is rejected. The snapshot values never change, even if item prices change later. [BR-SHIFT-08; AC-02]
8. **Given** a successful close, **when** the response returns, **then** the UI shows the final read-only summary (sales, cash, card, expected, counted, difference) and then logs the cashier out, revoking the session. [BR-SHIFT-09]
9. **Given** counted cash < 0, **when** it is submitted, **then** → `VALIDATION_ERROR`. [BR-SHIFT-07]
10. **Given** a CANCELLED order in the shift, **when** the shift closes, **then** that order is excluded from all totals. [BR-SHIFT-05; AC-06]
11. **Given** an ADMIN, **when** they call close-shift on any shift, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-02, BR-ROLE-03] (OQ-3 default: no admin force-close)

**Out of scope / notes:** printing a shift report (Z-report); a mandatory reason for a shortage (default OQ-36: none); transferring open orders to another cashier (default OQ-25: not supported).

---

## US-06 — As a cashier, I want a colour-coded grid of all tables with each one's current order so that I can see the floor at a glance and start or open orders.
**Screens:** 06 Tables (PDF p.13). Leads to 11 (available) and 07 (occupied).

**Acceptance criteria**
1. **Given** active tables, **when** screen 06 loads for a CASHIER, **then** it shows one card per *active* table, ordered by number ascending. Inactive tables are not shown. [BR-TBL-06]
2. **Given** a table referenced by an OPEN order, **when** it renders, **then** the card is amber, labelled "مشغولة" (colour + text + icon). It shows item count = Σ qty and the order's `total` (after discount), with the action "عرض الطلب" leading to screen 07. [BR-TBL-01, BR-TBL-04] (default OQ-14: the PDF mock shows 315 = subtotal; the rule says total = 300)
3. **Given** a table with no OPEN order, **when** it renders, **then** the card is green, labelled "متاحة", shows "—" for items and total, and has the action "فتح طاولة", which opens screen 11 bound to that table as DINE_IN. [BR-TBL-01, BR-TBL-03, BR-ORD-04]
4. **Given** the filter chips "الكل / متاحة / مشغولة", **when** one is selected, **then** the grid filters and each chip shows its count. The counts equal the derived occupancy. [BR-TBL-01]
5. **Given** occupancy is derived, **when** an order on table 5 becomes PAID or CANCELLED, **then** table 5 shows "متاحة" on the next fetch. No manual "free table" action exists. [BR-TBL-01, BR-TBL-05; AC-01, AC-06]
6. **Given** a cashier with no OPEN shift, **when** they press "فتح طاولة", **then** they are sent to screen 03 (UI), and any order creation → `NO_OPEN_SHIFT`. [BR-SHIFT-03]
7. **Given** a table occupied by *another* cashier's order, **when** a cashier opens it, **then** they see the order read-only (see US-07.5). [BR-ROLE-06]
8. **Given** an ADMIN, **when** screen 06 loads, **then** they see the same grid plus "إضافة طاولة" and per-table edit (US-21). "فتح طاولة" is not offered to the admin. [BR-ROLE-01, BR-ROLE-02]
9. **Given** the fastest path, **when** a cashier presses "فتح طاولة" on an available table, adds 2 items and presses "تأكيد الطلب", **then** the order is confirmed in ≤ 5 taps/clicks counted from screen 06. [AC-14; PDF p.32]
10. **Given** the need for a takeaway order, **when** the cashier presses "طلب سفري" on screen 06, **then** screen 11 opens in TAKEAWAY mode with no table. [BR-ORD-04] (default OQ-17)

**Out of scope / notes:** floor plans and zones. "الصالة الرئيسية" is a static label (default OQ-32). There is no table merge or split.

---

## US-07 — As a cashier, I want to see a table's details and current order so that I can add items, review it, or go to payment.
**Screens:** 07 Table Details (PDF p.14). Leads to 11, 12 and 13.

**Acceptance criteria**
1. **Given** an OCCUPIED table 5 with order #1048, **when** screen 07 loads, **then** it shows: the table number, the "مشغولة" badge, the current order number, the order's `created_at` time (Cairo), item count (Σ qty = 5), the owning cashier's name, and the order lines (name snapshot, unit price snapshot × qty, line total, note), plus the order total. [BR-TBL-04, BR-ITEM-03, BR-GEN-02; AC-01]
2. **Given** an OCCUPIED table and the cashier owns the order, **when** they press "إضافة أصناف", **then** screen 11 opens in edit mode for that OPEN order. "عرض الطلب" opens screen 12. "إغلاق الطاولة (دفع)" opens screen 13. [BR-TBL-05, BR-ORD-08]
3. **Given** an OCCUPIED table, **when** screen 07 renders, **then** "إضافة طلب" is disabled with the note "زر «إضافة طلب» يعمل فقط مع الطاولات المتاحة…". Any API attempt to create a second OPEN order on it → `TABLE_OCCUPIED`. [BR-TBL-02, BR-TBL-03]
4. **Given** an AVAILABLE active table, **when** screen 07 renders, **then** only "إضافة طلب" is enabled, and it opens screen 11 for that table. [BR-TBL-03]
5. **Given** the order on the table belongs to another cashier, **when** screen 07 renders, **then** the lines and totals are visible but "إضافة أصناف" and "إغلاق الطاولة (دفع)" are hidden. Any mutation API call → `NOT_ORDER_OWNER` (403). [BR-ROLE-06; AC-11]
6. **Given** "إغلاق الطاولة", **when** it is used, **then** it never frees the table by itself. The table frees only when payment succeeds. [BR-TBL-05]

**Out of scope / notes:** moving an order to another table (default OQ-18: not supported).

---

## US-08 — As an admin, I want to manage item categories and their order on the order screen so that the menu is organised for cashiers.
**Screens:** 08 Categories, including add/edit/delete dialogs (PDF p.15).

**Acceptance criteria**
1. **Given** categories exist, **when** screen 08 loads, **then** each card shows the name, item count, "الترتيب في شاشة الطلب" (`sort_order`), status (مفعّل/معطّل), and the actions تعديل / حذف. [BR §2 Category, BR-ITEM-06]
2. **Given** "إضافة تصنيف", **when** the admin submits a name, sort_order (integer) and status, **then** the category is created. A duplicate name → rejected (`VALIDATION_ERROR` with a field detail; default OQ-40). [BR §2 Category, BR-ROLE-01]
3. **Given** a category that contains ≥ 1 item (any status), **when** delete is confirmed, **then** → `CATEGORY_NOT_EMPTY` (409). The warning "لا يمكن حذف تصنيف يحتوي على أصناف؛ انقل الأصناف أو عطّل التصنيف بدلًا من حذفه" is shown. [BR-ITEM-05; AC-10]
4. **Given** a category with 0 items, **when** delete is confirmed in the confirm dialog, **then** the category is removed. [BR-ITEM-05]
5. **Given** a category is set DISABLED, **when** a cashier loads screen 11, **then** neither the category nor any of its items appear. Adding one of its items via the API → `ITEM_INACTIVE`. [BR-ITEM-05, BR-ITEM-01; AC-10]
6. **Given** categories with sort_order 1, 2, 2, **when** shown on screen 11, **then** they are ordered by sort_order ascending, then by name ascending. [BR-ITEM-06]
7. **Given** a CASHIER, **when** they call any category mutation, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-01, BR-ROLE-05]

**Out of scope / notes:** category images. Icons follow default OQ-33.

---

## US-09 — As an admin, I want a searchable list of all items where I can enable, disable or delete them so that the menu stays accurate.
**Screens:** 09 Items List (PDF p.16).

**Acceptance criteria**
1. **Given** items exist, **when** screen 09 loads, **then** a paginated table shows the name, category, price (2 decimals, ج.م), status and actions (edit, toggle, delete), with the footer "عرض 1–7 من N صنفًا". [BR-GEN-01]
2. **Given** the search box and category chips, **when** the admin types part of a name or picks a category, **then** the table filters to the matching items. [PDF p.16]
3. **Given** an ACTIVE item, **when** the admin toggles it, **then** its status becomes DISABLED immediately. It stops appearing on screen 11 and adding it → `ITEM_INACTIVE`. [BR-ITEM-01; AC-10]
4. **Given** an item referenced by any order line, **when** delete is confirmed, **then** → `ITEM_IN_USE` (409), with the message "الصنف مستخدم في طلبات سابقة، يمكنك تعطيله فقط". [BR-ITEM-04, BR-GEN-04; AC-10]
5. **Given** an item never used in any order line, **when** delete is confirmed in the confirm dialog, **then** it is hard-deleted. [BR-ITEM-04]
6. **Given** a disabled item, **when** past orders are viewed, **then** its lines still show the snapshot name and price. [BR-ITEM-03]
7. **Given** a CASHIER, **when** they call item mutations, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-01]

---

## US-10 — As an admin, I want one form to add or edit an item (name, category, price, description, status) so that the menu reflects current prices.
**Screens:** 10 Add / Edit Item (PDF p.17).

**Acceptance criteria**
1. **Given** the form, **when** the name, category or price is missing, or the price is ≤ 0, **then** "حفظ" stays disabled. If the API is called anyway → `VALIDATION_ERROR`. [BR-ITEM-02]
2. **Given** a price input "45.5" or "45.50", **when** it is saved, **then** `price_minor` = 4550. Input with more than 2 decimals (e.g. "45.505") → `VALIDATION_ERROR`. [BR-ITEM-02, BR-GEN-01]
3. **Given** a name that already exists in the same category, **when** saved, **then** it is rejected (`VALIDATION_ERROR`, default OQ-40). The same name in a *different* category is allowed. [BR §2 Item]
4. **Given** a description of more than 500 characters, **when** saved, **then** → `VALIDATION_ERROR`. [BR §2 Item]
5. **Given** the live preview, **when** fields change, **then** the preview card shows the name and price as they will appear on screen 11. This is UX only. [PDF p.17]
6. **Given** Cappuccino priced 45.00 is in an OPEN order and a PAID order, **when** the admin changes the price to 50.00, **then** the existing lines still show 45.00, and new lines added afterwards use 50.00. [BR-ITEM-03; AC-09]
7. **Given** the status toggle is set to disabled, **when** saved, **then** the item is hidden from the order screen and still appears in past orders (info note on the form). [BR-ITEM-01, BR-ITEM-03]
8. **Given** "إلغاء", **when** pressed, **then** the admin returns to screen 09 and nothing is saved. "حفظ" returns to screen 09 with a success message. [PDF p.17]

---

## US-11 — As a cashier, I want a fast full-screen order builder where I tap items, adjust quantities, add notes and a discount, then confirm, so that I can take an order in a few taps.
**Screens:** 11 Create Order, which is also its edit mode (PDF p.18).

**Acceptance criteria**
1. **Given** an OPEN shift and an available active table 5, **when** screen 11 opens from 06 or 07, **then** the header reads "طلب جديد — طاولة 5" with the cashier's name and shift status. No order number is shown before confirmation. [BR-ORD-01, BR-ORD-03] (the PDF shows #1048 before confirm; BR wins; see gaps G-10)
2. **Given** the catalogue, **when** screen 11 loads, **then** only ACTIVE items in ACTIVE categories are listed. Category chips are ordered by sort_order, then name, and "الكل" comes first. Search filters by item name. [BR-ITEM-01, BR-ITEM-06]
3. **Given** an empty cart, **when** the cashier taps Cappuccino, **then** a line with qty 1 is added. Tapping it again makes qty 2 (merge, because the notes are equal). [BR-ORD-05; AC-01]
4. **Given** a line "Cappuccino, note 'بدون سكر'", **when** Cappuccino is tapped again with no note, **then** a separate line is created. [BR-ORD-05]
5. **Given** a line with qty 1, **when** "−" is pressed, **then** the line is removed (qty never goes below 1). The trash icon also removes the line. [BR-ORD-02]
6. **Given** a note longer than 140 characters, **when** it is entered, **then** it is rejected (`VALIDATION_ERROR`). [BR §2 OrderLine]
7. **Given** the AC-01 cart (Cappuccino 45.00 × 2, Beef burger 120.00 × 1, Cheesecake 65.00 × 1, Orange juice 40.00 × 1), **when** a 15.00 discount is applied, **then** the preview shows subtotal 315.00, discount −15.00 and total 300.00. After confirmation the server response has the same values. [BR-ORD-06, BR-ORD-07, BR-GEN-03; AC-01]
8. **Given** the discount editor offers a percentage, **when** 10% of 315.00 is chosen, **then** the client sends a fixed amount of 31.50 (3150 minor, half-up). The server only ever receives an amount. [BR-ORD-07]
9. **Given** a discount > subtotal or < 0, **when** submitted, **then** → `DISCOUNT_INVALID` (422). [BR-ORD-07]
10. **Given** an empty cart, **when** "تأكيد الطلب" is pressed, **then** the button is disabled. The API → `ORDER_EMPTY` (422). [BR-ORD-02]
11. **Given** a valid cart, **when** "تأكيد الطلب" is pressed, **then** the server creates the order with status OPEN, `number` = next global sequence value (first ever = 1001), `type` = DINE_IN, `table_id` = 5, `cashier_id` = caller and `shift_id` = caller's OPEN shift. It stores name and price snapshots per line. The UI returns to screen 06, where table 5 shows "مشغولة · 5 أصناف · 300.00". [BR-ORD-01, BR-ORD-03, BR-ORD-10, BR-ITEM-03, BR-TBL-01, BR-TBL-04; AC-01]
12. **Given** a TAKEAWAY order ("سفري"), **when** it is confirmed, **then** `table_id` is null. Sending a table_id with TAKEAWAY, or omitting it with DINE_IN → `VALIDATION_ERROR`. [BR-ORD-04, BR §2 Order]
13. **Given** the table became occupied after screen 11 opened, **when** confirm is sent, **then** → `TABLE_OCCUPIED`, and the cart is kept client-side. [BR-TBL-02, BR-TBL-03; AC-04]
14. **Given** an inactive table, **when** a DINE_IN confirm targets it, **then** → `TABLE_INACTIVE`. [BR-TBL-03, BR-TBL-06]
15. **Given** an item was disabled after it was put in the cart, **when** confirm is sent, **then** → `ITEM_INACTIVE`, and no order is created. [BR-ITEM-01; AC-10] (default OQ-22)
16. **Given** no OPEN shift, **when** confirm is sent, **then** → `NO_OPEN_SHIFT`. [BR-SHIFT-03; AC-03]
17. **Given** edit mode on an OPEN order owned by the caller, **when** lines, quantities, notes or the discount change and "تأكيد الطلب" is pressed, **then** the server applies the changes, recomputes the totals, and keeps the existing lines' price snapshots. New lines use the current price. [BR-ORD-08, BR-ITEM-03, BR-ORD-06; AC-09] (merge with a differing snapshot: default OQ-21)
18. **Given** edit mode, **when** the edit removes every line, **then** → `ORDER_EMPTY`. Cancelling the order is a separate action (US-12). [BR-ORD-02]
19. **Given** an ADMIN, **when** they call create or edit order, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-02; AC-11]
20. **Given** the network is unavailable, **when** the cashier presses confirm, **then** no order is queued offline. The UI shows an error and keeps the cart. [BR §0 (offline order creation out of scope)]

**Out of scope / notes:** modifiers and variants; kitchen tickets; splitting the bill; offline creation.

---

## US-12 — As a cashier (or admin, read-only), I want to see an order's full details and, as its owner, edit, cancel or pay it so that mistakes can be fixed before payment.
**Screens:** 12 Order Details (PDF p.19).

**Acceptance criteria**
1. **Given** order #1048, **when** screen 12 loads, **then** it shows: the number, table (or "سفري"), cashier, `created_at` (Cairo, `DD/MM/YYYY · HH:mm`), status badge, and lines (name snapshot, qty, unit price snapshot, line total, note). It also shows subtotal ("الإجمالي" 315.00), discount (−15.00) and "الإجمالي النهائي" (300.00). [BR-ORD-06, BR-ITEM-03, BR-GEN-02]
2. **Given** an OPEN order owned by the caller, **when** screen 12 renders, **then** "دفع الطلب" (to 13), "تعديل الطلب" (to 11 edit) and "إلغاء الطلب" are shown. [BR-ORD-08, BR-ROLE-03]
3. **Given** "إلغاء الطلب", **when** pressed, **then** a confirm dialog asks for a reason (required, ≥ 3 characters after trimming). A reason under 3 characters → `VALIDATION_ERROR`. [BR-ORD-09] (the PDF dialog has no reason field; BR wins; see G-12)
4. **Given** a valid reason and confirmation, **when** the server cancels the order, **then** the status becomes CANCELLED and `cancelled_at` and `cancel_reason` are stored. The table becomes AVAILABLE. The order stays in history as "ملغي", and it is excluded from shift totals. [BR-ORD-09, BR-TBL-05, BR-SHIFT-05; AC-06]
5. **Given** a PAID or CANCELLED order, **when** screen 12 renders, **then** the edit, cancel and pay buttons are absent. Any edit or cancel API call → `ORDER_NOT_EDITABLE` (409). [BR-ORD-08; AC-05]
6. **Given** a PAID order, **when** screen 12 renders, **then** it also shows the payment method, `paid_at`, and for CASH the amount received and change. A CANCELLED order shows `cancelled_at` and the reason. (Content default: G-19.) [BR §2 Payment, BR-ORD-09]
7. **Given** another cashier's order, **when** a cashier opens it, **then** it is read-only. Any mutation → `NOT_ORDER_OWNER`. [BR-ROLE-06; AC-11]
8. **Given** an ADMIN, **when** they open any order, **then** it is read-only ("عرض فقط"). Any mutation → `FORBIDDEN_ROLE`. [BR-ROLE-01, BR-ROLE-02; AC-11]
9. **Given** a cashier, **when** they request an order they do not own via history, **then** it is not listed for them (BR-ROLE-04). Direct access to *another cashier's* order is allowed only read-only through the tables flow (BR-ROLE-06). [BR-ROLE-04, BR-ROLE-06] (see OQ-11)

---

## US-13 — As a cashier, I want to take a cash or card payment with automatic change calculation so that the order is closed correctly and quickly.
**Screens:** 13 Payment (PDF p.20).

**Acceptance criteria**
1. **Given** OPEN order #1048 with total 300.00, **when** screen 13 loads, **then** the order summary (lines, discount) and "المبلغ المطلوب 300.00 ج.م" are shown in large type. [BR-ORD-06]
2. **Given** method CASH, **when** the cashier enters 350.00 with the keypad or the quick amounts ("مضبوط" = exact total, or preset values), **then** "الباقي للعميل" shows 50.00 as a preview. [BR-PAY-02]
3. **Given** CASH with received < total (e.g. 250.00), **when** the screen renders, **then** "تأكيد الدفع" is disabled. The API → `INSUFFICIENT_CASH` (422). [BR-PAY-02; AC-08]
4. **Given** CASH 350.00 on total 300.00, **when** payment is confirmed, **then** one transaction locks the order, verifies it is OPEN and in the caller's OPEN shift, inserts a Payment (`method` CASH, `amount_due` 30000, `amount_received` 35000, `change` 5000, `paid_at` = server time), and sets the order to PAID. Table 5 becomes AVAILABLE. [BR-PAY-01, BR-PAY-02, BR-PAY-04, BR-PAY-05, BR-TBL-05; AC-01]
5. **Given** method CARD, **when** it is selected, **then** the received field is hidden. The server stores `amount_received` = total and `change` = 0. A request that includes a received amount for CARD → `VALIDATION_ERROR`. [BR-PAY-03; AC-08]
6. **Given** the same `Idempotency-Key` sent twice (double click or retry), **when** both are processed, **then** exactly one Payment exists and both responses report the same result. [BR-PAY-04; AC-07]
7. **Given** a second payment request with a *different* key on an already PAID order, **when** processed, **then** → `ORDER_NOT_EDITABLE`. [BR-PAY-04, BR-ORD-08; AC-07]
8. **Given** a payment method other than CASH or CARD, or an attempt at a second or partial payment, **when** submitted, **then** it is rejected (`VALIDATION_ERROR`, or `ORDER_NOT_EDITABLE` if the order is already PAID). [BR-PAY-01]
9. **Given** another cashier's order, **when** payment is attempted, **then** → `NOT_ORDER_OWNER`. [BR-ROLE-06, BR-PAY-04; AC-11]
10. **Given** the cashier has no OPEN shift, **when** payment is attempted, **then** → `NO_OPEN_SHIFT`. [BR-SHIFT-03]
11. **Given** an ADMIN, **when** payment is attempted, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-02]
12. **Given** success, **when** the response returns, **then** the UI goes to screen 14. [PDF p.20]

**Out of scope / notes:** split payments, tips, refunds and voids after payment (default OQ-26), card terminal integration and card reference capture (default OQ-28).

---

## US-14 — As a cashier, I want a clear success screen with a receipt preview and print option so that I can hand the customer a receipt and get back to work.
**Screens:** 14 Order Success (PDF p.21).

**Acceptance criteria**
1. **Given** a successful payment, **when** screen 14 loads, **then** it shows "تم إتمام الطلب بنجاح", "تم تسجيل الدفع وأصبحت طاولة 5 متاحة" (for TAKEAWAY the table phrase is omitted), and the number, total, payment method and `paid_at` time (Cairo). [BR-PAY-05, BR-TBL-05]
2. **Given** "طباعة الفاتورة", **when** it is pressed, **then** the browser print dialog opens with an 80 mm receipt layout. No printer driver is used. [BR-PAY-06]
3. **Given** the receipt, **when** it is rendered, **then** it contains: the business name (OQ-2 / OQ-7), the order number, table or "سفري", date and time, lines (name × qty, line total), discount, total, method, and for CASH "مستلم / باقي". No tax lines appear, and the title contains no "ضريبية" wording. [BR-PAY-06; OQ-1] (defaults OQ-8, OQ-9)
4. **Given** "طلب جديد", **when** it is pressed, **then** screen 11 opens in TAKEAWAY mode. "العودة للطاولات" opens screen 06. [BR-ORD-04; PDF p.21]
5. **Given** screen 14 is refreshed, **when** it reloads, **then** it shows the stored payment data from the server and does not re-submit payment. [BR-PAY-04, BR-GEN-03]

**Out of scope / notes:** auto-print; email or SMS receipts; reprint from history (default OQ-10: not in MVP).

---

## US-15 — As a cashier or admin, I want an order history with filters so that I can find any order quickly.
**Screens:** 15 Orders History (PDF p.22).

**Acceptance criteria**
1. **Given** an ADMIN, **when** screen 15 loads, **then** it lists all orders, newest first, with the columns number, table or "سفري", cashier, total, payment method ("—" if not PAID), status badge and date `DD/MM · HH:mm` (Cairo), plus an eye icon to screen 12. [BR-ROLE-01, BR-GEN-02]
2. **Given** a CASHIER, **when** screen 15 loads, **then** it lists only orders where `cashier_id` = caller. The cashier filter is hidden. The API ignores or rejects any attempt to query other cashiers' orders. [BR-ROLE-04, BR-ROLE-05] (scope "own orders, all shifts" vs "current shift only": OQ-11)
3. **Given** the filters "اليوم / أمس / هذا الأسبوع / date / cashier (admin) / payment method / order-number search", **when** they are applied, **then** results match. "اليوم" and "أمس" are Cairo calendar days on `created_at`. [BR-GEN-02] (timestamp and week start: default OQ-16)
4. **Given** a cancelled order, **when** it is listed, **then** it appears with status "ملغي" and is never removed. [BR-ORD-09; AC-06]
5. **Given** the footer, **when** it renders, **then** it shows the day's counts "N طلبًا اليوم · مدفوع a · مفتوح b · ملغي c", where N = a + b + c. [BR-GEN-02] (default OQ-15)
6. **Given** search "#1048" or "1048", **when** applied, **then** order 1048 is found. [BR-ORD-10]

**Out of scope / notes:** CSV/PDF export; advanced reports (BR §0).

---

## US-16 — As an admin, I want a list of cashiers showing who is working now so that I can monitor operations and manage cashier accounts.
**Screens:** 16 Cashiers List (PDF p.23).

**Acceptance criteria**
1. **Given** users with role CASHIER, **when** screen 16 loads, **then** it lists only CASHIER users, with the name, username, status, current shift ("مفتوحة منذ HH:mm" or "لا توجد") and `last_login_at`. The tab chips are "الكل / نشط / معطّل" with counts, and there is a name search. [BR §2 User (Cashier = projection), BR-ROLE-01]
2. **Given** "إضافة كاشير", **when** it is pressed, **then** screen 19 opens with the role preset to CASHIER. [BR §2 User; PDF p.23]
3. **Given** a cashier with an OPEN shift, **when** the admin tries to disable them, **then** → `USER_HAS_OPEN_SHIFT` (409). The info note "لا يمكن تعطيل كاشير لديه وردية مفتوحة قبل إغلاقها" is shown. [BR-USR-03; AC-12]
4. **Given** a cashier with no OPEN shift, **when** disable is confirmed in the confirm dialog, **then** the status becomes DISABLED and their active sessions are revoked immediately. [BR-AUTH-02, BR-USR-02]
5. **Given** "عرض", **when** it is pressed, **then** screen 17 opens. [PDF p.23]
6. **Given** a CASHIER, **when** they call this endpoint, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-01; AC-11]

---

## US-17 — As an admin, I want a cashier's profile with their current shift and shift history, including the cash difference per shift, so that I can check cash accuracy.
**Screens:** 17 Cashier Details (PDF p.24).

**Acceptance criteria**
1. **Given** cashier Ahmed, **when** screen 17 loads, **then** it shows the name, username, status, role and date added. If a shift is OPEN, it also shows that shift's start and live `orders_count · sales_total`. [BR-SHIFT-05, BR §2 User] (created date: G-24)
2. **Given** shift history, **when** it renders, **then** each row shows the shift code, date, start, end ("جارية" if OPEN), `orders_count`, `sales_total` and `difference`: green "+5.00", green "0.00", red "−10.00", or the badge "مفتوحة" if OPEN. Values for CLOSED shifts come from the stored snapshot. [BR-SHIFT-05, BR-SHIFT-07, BR-SHIFT-08] (shift code and default range: OQ-35)
3. **Given** a shift row, **when** it is pressed, **then** the read-only shift summary opens (opening balance, sales, cash, card, expected, counted, difference). [BR-SHIFT-08] (screen: default OQ-12)
4. **Given** "تعديل", **when** it is pressed, **then** screen 19 opens. "تعطيل" follows the rules in US-16.3–4. [BR-USR-03]
5. **Given** a CLOSED shift, **when** item prices later change, **then** its stored totals are unchanged. [BR-SHIFT-08, BR-ITEM-03]

---

## US-18 — As an admin, I want a list of all user accounts with role tabs and search so that I can manage who can access the system.
**Screens:** 18 Users List (PDF p.25).

**Acceptance criteria**
1. **Given** users exist, **when** screen 18 loads, **then** it lists all users with the name, username, role badge, status and last login. The tabs "الكل / مدير / كاشير" show counts, and search matches name or username. [BR-ROLE-01]
2. **Given** any user, **when** the admin looks for a delete action, **then** none exists, and no delete endpoint exists. Users can only be disabled. [BR-USR-02, BR-GEN-04]
3. **Given** the only ACTIVE ADMIN, **when** anyone tries to disable them, **then** → `LAST_ADMIN` (409). [BR-USR-04; AC-12]
4. **Given** a user is disabled, **when** they next call any API with an existing session, **then** the request is rejected as unauthenticated (their sessions were revoked), and login → `USER_DISABLED`. [BR-AUTH-02; AC-12]
5. **Given** a DISABLED user, **when** the admin re-enables them, **then** the status becomes ACTIVE and they can log in again. [BR §10 User]
6. **Given** a CASHIER, **when** they call `/users`, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-01, BR-ROLE-05; AC-11]

---

## US-19 — As an admin, I want a simple form to add or edit a user (name, username, password, role, status) so that each staff member has their own account.
**Screens:** 19 Add / Edit User (PDF p.26).

**Acceptance criteria**
1. **Given** add mode, **when** the name, username, password (≥ 8 characters) and role are provided, **then** the user is created. The password is stored only as an argon2id/bcrypt hash and is never returned by any API. [BR-USR-01, BR §2 User]
2. **Given** a username not matching `[a-z0-9._]{3,32}` (after lower-casing), or one equal case-insensitively to an existing username, **when** saved, **then** it is rejected (`VALIDATION_ERROR`; default OQ-40). [BR §2 User]
3. **Given** edit mode, **when** the password field is left empty, **then** the password is unchanged. When a value is entered, it must be ≥ 8 characters. [BR-USR-01]
4. **Given** the role cards "مدير / كاشير" with permission descriptions, **when** the role of a user with an OPEN shift is changed, **then** → `USER_HAS_OPEN_SHIFT`. [BR-USR-05]
5. **Given** the last ACTIVE ADMIN, **when** edited to role CASHIER or status DISABLED, **then** → `LAST_ADMIN`. [BR-USR-04; AC-12]
6. **Given** the status toggle is set to DISABLED for a cashier with an OPEN shift, **when** saved, **then** → `USER_HAS_OPEN_SHIFT`. [BR-USR-03; AC-12]
7. **Given** "إلغاء", **when** pressed, **then** the admin returns to the previous list and nothing is saved. "حفظ" returns to screen 18. [PDF p.26]

**Out of scope / notes:** email field; per-user custom permissions; any roles beyond ADMIN and CASHIER.

---

## US-20 — As an admin, I want a dashboard with six simple indicators and two short lists so that I can see today's operation at a glance.
**Screens:** 20 Admin Dashboard (PDF p.27).

**Acceptance criteria**
1. **Given** today (Cairo calendar day), **when** screen 20 loads, **then** it shows:
   - "مبيعات اليوم" = Σ total of PAID orders with `paid_at` today, with the sub-line "من X طلبًا مدفوعًا", where X = count of those PAID orders
   - "عدد الطلبات" = orders created today (all statuses), with the sub-line "b مفتوحة · c ملغي"
   - "الورديات المفتوحة" = count of OPEN shifts, with the cashier names
   - "الطاولات المشغولة" / "الطاولات المتاحة" over active tables ("من أصل N")
   - "عدد الكاشير" = CASHIER users, with the sub-line "a نشط · d معطّل"
   
   [BR-GEN-02, BR-SHIFT-05, BR-TBL-01, BR-ROLE-01] (definitions: default OQ-15; the PDF mock "من 86 طلبًا مدفوعًا" conflicts; see G-16)
2. **Given** open shifts, **when** "الورديات المفتوحة الآن" renders, **then** each row shows the cashier, start time and live `sales_total`, and opens screen 17. [BR-SHIFT-05]
3. **Given** recent orders, **when** "أحدث الطلبات" renders, **then** it shows the latest 3 orders (number, table or "سفري", cashier, total, status), with "عرض السجل" leading to screen 15. [BR-ROLE-01]
4. **Given** the header badge, **when** any admin screen renders, **then** it shows the live count of open shifts (e.g. "ورديتان مفتوحتان الآن"). [PDF p.15–27]
5. **Given** the MVP scope, **when** screen 20 renders, **then** it contains no charts or analytics. [BR §0]
6. **Given** a CASHIER, **when** they request admin dashboard data, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-05]

---

## US-21 — As an admin, I want to add, renumber and activate or deactivate tables so that the tables screen matches the physical floor.
**Screens:** 06 Tables (admin variant: "إضافة طاولة", table edit) (PDF p.13).

**Acceptance criteria**
1. **Given** "إضافة طاولة", **when** a positive integer number not already used is submitted, **then** the table is created as active. A duplicate or non-positive number → rejected (`VALIDATION_ERROR`; default OQ-40). [BR-TBL-06, BR §2 Table]
2. **Given** an AVAILABLE table, **when** the admin renumbers it to an unused number, or deactivates it, **then** the change is saved. Inactive tables disappear from the cashier grid and cannot receive orders (`TABLE_INACTIVE`). [BR-TBL-06, BR-TBL-03]
3. **Given** an OCCUPIED table, **when** the admin tries to deactivate or renumber it, **then** → `TABLE_OCCUPIED`. [BR-TBL-06]
4. **Given** a table referenced by any order, **when** deletion is attempted, **then** it is not possible. Deactivation is the only removal path in the MVP. [BR-GEN-04] (default OQ-32: no delete at all)
5. **Given** the admin, **when** viewing the grid, **then** they see all tables, including inactive ones marked "معطّل", and cannot open orders. [BR-ROLE-01, BR-ROLE-02]
6. **Given** a CASHIER, **when** calling table mutations, **then** → `FORBIDDEN_ROLE`. [BR-ROLE-01]

---

## US-22 — As a cashier, I want the full daily flow (login → open shift → table → order → pay → free table → close shift) to work end to end so that a whole working day is supported.
**Screens / flow:** PDF p.28 (17-step flow), p.29 (step explanations), p.30 (main scenario, screens 01 → 03 → 06 → 07 → 11 → 12 → 13 → 14 → 06 → 05).

**Acceptance criteria**
1. **Given** `ahmed.cashier` logs in (01), **when** he opens a shift with 500.00 (03), picks available table 5 (06/07), adds Cappuccino 45.00 × 2, Beef burger 120.00, Cheesecake 65.00 and Orange juice 40.00, applies a 15.00 discount and confirms (11), **then** the subtotal is 315.00, the total 300.00, and table 5 is OCCUPIED showing 5 items and 300.00. [BR-ORD-05, BR-ORD-06, BR-ORD-07, BR-TBL-01, BR-TBL-04; AC-01]
2. **Given** that order, **when** he pays CASH 350.00 (12 → 13), **then** the change is 50.00, the order is PAID, screen 14 shows success, and table 5 is AVAILABLE on screen 06. [BR-PAY-02, BR-PAY-05, BR-TBL-05; AC-01]
3. **Given** the shift reaches opening 500.00, cash 3,120.00 and card 1,730.00 with no OPEN orders, **when** he enters counted 3,600.00 and confirms close (05), **then** expected = 3,620.00 and difference = −20.00 (عجز). The shift is CLOSED and immutable, the summary is shown, and he is logged out. [BR-SHIFT-04..09; AC-02]
4. **Given** the loop in steps 5–14, **when** repeated for multiple orders, **then** each order gets a distinct increasing number. [BR-ORD-10]
5. **Given** the fastest path (06 → available table → item → item → confirm), **when** measured, **then** it takes ≤ 5 taps. [AC-14]

---

## US-23 — As the business owner, I want every permission and ownership rule enforced by the server so that no one can bypass the UI to do what their role forbids.
**Screens:** all. PDF p.4 (permissions matrix), p.5 (navigation).

**Acceptance criteria**
1. **Given** an ADMIN token, **when** calling open shift, create/edit/cancel order or pay, **then** each → `FORBIDDEN_ROLE` (403). [BR-ROLE-02, BR-ROLE-05; AC-11]
2. **Given** a CASHIER token, **when** calling any users, cashiers, tables, categories or items mutation, or the admin dashboard, **then** each → `FORBIDDEN_ROLE`. [BR-ROLE-01, BR-ROLE-05; AC-11]
3. **Given** cashier B, **when** mutating cashier A's order (edit, cancel, pay), **then** → `NOT_ORDER_OWNER`. [BR-ROLE-06; AC-11]
4. **Given** a CASHIER, **when** listing orders or shifts, **then** only their own are returned. [BR-ROLE-04]
5. **Given** a CASHIER, **when** closing a shift that is not theirs, **then** it is rejected. [BR-ROLE-03]
6. **Given** navigation, **when** a CASHIER is logged in, **then** the sidebar shows exactly الرئيسية, الطاولات, الطلبات, الورديات and الحساب. An ADMIN sees الرئيسية, الكاشير, المستخدمون, الطاولات, الأصناف, الطلبات, الورديات and الإعدادات. The admin never sees Create Order. [BR-ROLE-01..03; PDF p.5] (الحساب: OQ-13; الإعدادات: OQ-7; الورديات: OQ-12)
7. **Given** no or expired authentication, **when** calling any endpoint except login, **then** it is rejected as unauthenticated. [BR-ROLE-05] (error code: OQ-40)

---

## US-24 — As the business owner, I want the system to stay consistent under simultaneous actions so that there are never duplicate orders on a table, duplicate shifts or double payments.
**Screens:** 03, 11, 13.

**Acceptance criteria**
1. **Given** two cashiers confirm DINE_IN orders on the same AVAILABLE table at the same moment, **when** both requests hit the server, **then** exactly one succeeds and the other → `TABLE_OCCUPIED`. There is never more than one OPEN order per table (DB partial unique index). [BR-TBL-02; AC-04]
2. **Given** two simultaneous open-shift requests by one cashier, **when** processed, **then** exactly one shift is created and the other → `SHIFT_ALREADY_OPEN`. [BR-SHIFT-01; AC-03]
3. **Given** two payment requests with the same Idempotency-Key, **when** processed concurrently, **then** exactly one Payment row exists. [BR-PAY-04; AC-07]
4. **Given** a payment and a cancel on the same OPEN order at once, **when** processed, **then** exactly one wins (row lock) and the other → `ORDER_NOT_EDITABLE`. [BR-PAY-04, BR-ORD-08]
5. **Given** a close-shift and a create-order at the same time for one cashier, **when** processed, **then** either the order is created and the close → `SHIFT_HAS_OPEN_ORDERS`, or the close succeeds and the create → `NO_OPEN_SHIFT`. The shift never closes with an OPEN order. [BR-SHIFT-03, BR-SHIFT-04]

---

## US-25 — As any user, I want the whole interface in Arabic RTL with large touch targets and clear Arabic error messages so that it is easy to use on a POS touchscreen.
**Screens:** all 01–20. PDF p.5 (sidebar behaviour), p.6 (design system), p.32 (UX guidelines).

**Acceptance criteria**
1. **Given** any of the 20 screens, **when** rendered at 1280×800 and at 1024×768, **then** the root has `dir="rtl"`, there is no horizontal scroll, and all interactive targets are ≥ 44 px (primary buttons 58 px). [BR-GEN-05; AC-15]
2. **Given** a viewport narrower than 1024 px, **when** rendered, **then** the right-hand sidebar collapses to icons. Screen 11 always uses the mini sidebar. [PDF p.5, p.18]
3. **Given** any number or amount, **when** displayed, **then** it uses Western digits 0–9. [BR-GEN-05]
4. **Given** every BR §9 error code, **when** the API returns it, **then** the UI shows exactly the Arabic message from BR §9. [BR-GEN-06, BR §9]
5. **Given** any status (table, order, shift, user, item), **when** shown, **then** it uses colour + text + icon, never colour alone, with the design-system badges متاحة / مشغولة / مدفوع / مفتوح / ملغي / وردية مفتوحة / معطّل. [PDF p.6, p.32]
6. **Given** sensitive actions (open shift, close shift, cancel order, delete, disable), **when** triggered, **then** a confirm dialog with an icon, title, data summary and two equal buttons (تأكيد / رجوع) appears. The server never relies on it. [BR-SHIFT-10; PDF p.6]
7. **Given** an action that is not allowed in the current state, **when** rendered, **then** the button is disabled *with a visible reason*. [PDF p.32]

---

## US-26 — As the business owner, I want all money handled as exact integers and all times shown in Cairo time so that totals are always correct and match the working day.
**Screens:** all screens that show money or time.

**Acceptance criteria**
1. **Given** any money field in the API, **when** inspected, **then** it is an integer in minor units named `*_minor`. No float appears in any money calculation. [BR-GEN-01]
2. **Given** any displayed amount, **when** rendered, **then** it shows 2 decimals and the label ج.م (e.g. "4,850.00 ج.م"). [BR-GEN-01] (the PDF shows whole numbers on cards; see OQ-34)
3. **Given** timestamps, **when** stored, **then** they are UTC. **When** displayed, **then** they are in Africa/Cairo. [BR-GEN-02]
4. **Given** an order paid at 23:30 Cairo time, which is a different UTC date, **when** "today" is computed, **then** the order counts on the Cairo day. [BR-GEN-02]
5. **Given** any total, change, expected cash or difference, **when** the client preview differs from the server, **then** the server value is displayed after the response. [BR-GEN-03]
6. **Given** a record ever referenced by an order or shift (user, item, table), **when** deletion is attempted, **then** it is refused, and disabling is the path. [BR-GEN-04]

---

## US-27 — As a logged-in user, I want a consistent app shell (sidebar, header with shift status, date and my name, logout) so that I always know my context.
**Screens:** header and sidebar on 02–20 (PDF p.5, p.9–27).

**Acceptance criteria**
1. **Given** a CASHIER, **when** any screen renders, **then** the header shows the shift status pill ("الوردية مفتوحة · منذ 08:00 ص" or "لا توجد وردية مفتوحة"), today's date in Arabic with Western digits (e.g. "السبت 26 سبتمبر 2026"), and the user's name and role. [BR-GEN-02, BR-GEN-05]
2. **Given** an ADMIN, **when** any screen renders, **then** the header shows the open-shifts count pill. [PDF p.15–27]
3. **Given** the logout icon, **when** pressed, **then** the session is ended. An OPEN shift stays OPEN and is resumed at the next login. [BR-SHIFT-08 (only close ends a shift)] (default OQ-29)
4. **Given** the cashier menu item "الحساب", **when** pressed, **then** a read-only profile (name, username, role) with logout is shown. [default OQ-13]

---

## Coverage matrix

### A. Business rules → user stories
| BR ID | Covered by |
|---|---|
| BR-GEN-01 | US-03, US-09, US-10, US-11, US-26 |
| BR-GEN-02 | US-02, US-04, US-07, US-12, US-15, US-20, US-26, US-27 |
| BR-GEN-03 | US-02, US-04, US-05, US-11, US-14, US-26 |
| BR-GEN-04 | US-09, US-18, US-21, US-26 |
| BR-GEN-05 | US-25, US-27 |
| BR-GEN-06 | US-01, US-25 |
| BR-ROLE-01 | US-06, US-08, US-09, US-12, US-15, US-16, US-18, US-20, US-21, US-23 |
| BR-ROLE-02 | US-03, US-05, US-06, US-11, US-12, US-13, US-21, US-23 |
| BR-ROLE-03 | US-05, US-12, US-23 |
| BR-ROLE-04 | US-04, US-12, US-15, US-23 |
| BR-ROLE-05 | US-03, US-08, US-15, US-18, US-20, US-23 |
| BR-ROLE-06 | US-06, US-07, US-12, US-13, US-23 |
| BR-AUTH-01 | US-01 |
| BR-AUTH-02 | US-01, US-16, US-18 |
| BR-AUTH-03 | US-01 |
| BR-AUTH-04 | US-01, US-02 |
| BR-USR-01 | US-19 |
| BR-USR-02 | US-16, US-18 |
| BR-USR-03 | US-16, US-17, US-19 |
| BR-USR-04 | US-18, US-19 |
| BR-USR-05 | US-19 |
| BR-SHIFT-01 | US-02, US-03, US-24 |
| BR-SHIFT-02 | US-03 |
| BR-SHIFT-03 | US-02, US-03, US-04, US-06, US-11, US-13, US-24 |
| BR-SHIFT-04 | US-05, US-22, US-24 |
| BR-SHIFT-05 | US-02, US-04, US-05, US-12, US-17, US-20, US-22 |
| BR-SHIFT-06 | US-05, US-22 |
| BR-SHIFT-07 | US-05, US-17, US-22 |
| BR-SHIFT-08 | US-05, US-17, US-22, US-27 |
| BR-SHIFT-09 | US-05, US-22 |
| BR-SHIFT-10 | US-02, US-03, US-05, US-25 |
| BR-TBL-01 | US-02, US-06, US-11, US-20, US-22 |
| BR-TBL-02 | US-07, US-11, US-24 |
| BR-TBL-03 | US-06, US-07, US-11, US-21 |
| BR-TBL-04 | US-02, US-06, US-07, US-11, US-22 |
| BR-TBL-05 | US-06, US-07, US-12, US-13, US-14, US-22 |
| BR-TBL-06 | US-06, US-11, US-21 |
| BR-ITEM-01 | US-08, US-09, US-10, US-11 |
| BR-ITEM-02 | US-10 |
| BR-ITEM-03 | US-07, US-09, US-10, US-11, US-12, US-17 |
| BR-ITEM-04 | US-09 |
| BR-ITEM-05 | US-08 |
| BR-ITEM-06 | US-08, US-11 |
| BR-ORD-01 | US-11 |
| BR-ORD-02 | US-11 |
| BR-ORD-03 | US-11 |
| BR-ORD-04 | US-06, US-11, US-14 |
| BR-ORD-05 | US-11, US-22 |
| BR-ORD-06 | US-11, US-12, US-13, US-22 |
| BR-ORD-07 | US-11, US-22 |
| BR-ORD-08 | US-07, US-11, US-12, US-13, US-24 |
| BR-ORD-09 | US-12, US-15 |
| BR-ORD-10 | US-02, US-04, US-11, US-15, US-22 |
| BR-PAY-01 | US-13 |
| BR-PAY-02 | US-13, US-22 |
| BR-PAY-03 | US-13 |
| BR-PAY-04 | US-13, US-14, US-24 |
| BR-PAY-05 | US-13, US-14, US-22 |
| BR-PAY-06 | US-14 |
| BR §0 Scope (out-of-scope list) | US-11, US-15, US-20 (negative criteria) |
| BR §2 Entities (field constraints) | US-01, US-08, US-10, US-11, US-16, US-19, US-21 |
| BR §9 Error codes (all 20) | US-25.4 (message mapping); each code is exercised in at least one story. `TABLE_INACTIVE`: US-11, US-21. `VALIDATION_ERROR`: US-03, US-10, US-11, US-19 |
| BR §10 State machines | Shift: US-03/05 · Order: US-11/12/13 · Table: US-06 · User: US-18 |

**Unmapped BR IDs: none.** Every BR-* ID in v1.1 has ≥ 1 story.

### B. Acceptance scenarios → user stories
| AC | Covered by |
|---|---|
| AC-01 Golden path | US-03, US-06, US-07, US-11, US-13, US-22 |
| AC-02 Shift close math | US-05, US-22 |
| AC-03 Guard rails | US-03, US-05, US-11, US-24 |
| AC-04 Table concurrency | US-11, US-24 |
| AC-05 Paid is final | US-12 |
| AC-06 Cancel | US-02, US-05, US-06, US-12, US-15 |
| AC-07 Double pay | US-13, US-24 |
| AC-08 Cash validation | US-13 |
| AC-09 Snapshots | US-10, US-11 |
| AC-10 Catalog | US-08, US-09, US-11 |
| AC-11 RBAC | US-03, US-07, US-11, US-12, US-13, US-16, US-18, US-23 |
| AC-12 Users | US-01, US-16, US-18, US-19 |
| AC-13 Login throttle | US-01 |
| AC-14 Speed | US-06, US-22 |
| AC-15 RTL | US-25 |

**Unmapped AC: none.**

### C. PDF screens → user stories
| Screen | PDF page | Covered by |
|---|---|---|
| 01 Login | 8 | US-01 |
| 02 Cashier Dashboard | 9 | US-02, US-27 |
| 03 Open Shift | 10 | US-03 |
| 04 Current Shift | 11 | US-04 |
| 05 Close Shift | 12 | US-05, US-22 |
| 06 Tables | 13 | US-06, US-21 |
| 07 Table Details | 14 | US-07 |
| 08 Categories | 15 | US-08 |
| 09 Items List | 16 | US-09 |
| 10 Add/Edit Item | 17 | US-10 |
| 11 Create Order | 18 | US-11, US-22 |
| 12 Order Details | 19 | US-12 |
| 13 Payment | 20 | US-13 |
| 14 Order Success | 21 | US-14 |
| 15 Orders History | 22 | US-15 |
| 16 Cashiers List | 23 | US-16 |
| 17 Cashier Details | 24 | US-17 |
| 18 Users List | 25 | US-18 |
| 19 Add/Edit User | 26 | US-19 |
| 20 Admin Dashboard | 27 | US-20 |
| Flow / scenario | 28–30 | US-22 |
| Design system / UX guidelines | 6, 32 | US-25 |
| Navigation | 5 | US-23, US-27 |

**Unmapped screens: none.** Several UI elements, however, have **no screen in 01–20 and no business rule**. They are flagged, not covered:
- ⚠ Admin **الإعدادات / Settings** (PDF p.5). No screen and no BR entity. → OQ-7 (with OQ-2)
- ⚠ Cashier **الحساب / Account** (PDF p.5). No screen. → OQ-13
- ⚠ **Shift history list / shift summary detail** (admin "الورديات" nav, screen 17 row action, BR §0 "shift history"). No screen. → OQ-12
- ⚠ **Admin table add/edit form** (screen 06 mentions it but it is not drawn). Covered by US-21 as a dialog on 06.
