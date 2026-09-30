# Contract review — openapi.yaml (DRAFT for Gate B) vs BUSINESS_RULES v1.2

- Task: P2-02. Reviewer: product-analyst. Date: 2026-09-29.
- Inputs: `docs/api/openapi.yaml` (1.0.0, `x-business-rules-version: '1.2'`), `docs/business/BUSINESS_RULES.md` v1.2,
  `docs/product/user-stories.md` v1.1, `docs/adr/0001–0013`, `docs/traceability.md`.
- Scope: business correctness only (rules, codes, statuses, roles, money, AC testability). Transport/security design is
  the team-lead's call and is not judged here.

## 1. Summary of checks

| Check | Result |
|---|---|
| Every BR-* rule enforced by ≥ 1 operation | PASS. 64/64 rules are mapped. BR-GEN-05 and BR-SHIFT-10 are UI-only (correct). BR-GEN-01/03/06 are cross-cutting (envelope + `*_minor`). |
| §9 codes present with the §9 HTTP status | PASS for all 24 codes. The `ErrorCode` enum also contains `INTERNAL_ERROR`, which is not in §9 (see #3). |
| Role restrictions (`x-roles`) vs BR-ROLE-01..06 | PASS, with one exception: `getOrder` is too broad for a CASHIER (see #2). |
| Money fields are integer `*_minor` | PASS. Every money field is `integer`/`int64` and ends in `_minor`. No float or decimal money anywhere. One missing lower bound (see #6). |
| `Idempotency-Key` on payment | PASS. It is required on `payOrder`, with replay, `IDEMPOTENCY_CONFLICT`, and `ORDER_NOT_EDITABLE` for a different key (BR-PAY-04, AC-07). |
| AC-01…AC-15 testable through the contract | PASS for AC-01…AC-13 (API). AC-14 and AC-15 are UI-only, and the contract does not block them: the ≤ 5-tap path needs only `listTables` → `getCatalog` → `createOrder`. |
| No invented business behaviour | PASS with minor notes (#4, #10, #13). The Gate B defaults are assessed in §3. |

## 2. Findings

| # | Severity | Operation | BR/AC | Issue | Fix |
|---|---|---|---|---|---|
| 1 | major | createOrder, updateOrder, createItem, updateItem | BR §9 (`NOT_FOUND`, OQ-40), US-23.8 | The contract returns `VALIDATION_ERROR` (422) for an unknown `table_id`, `item_id` or `category_id` in the request body. BR §9 v1.2 says `NOT_FOUND` applies when "the referenced resource id does not exist", and US-23.8 names table, category and item explicitly. This contradicts a higher source. | Return `NOT_FOUND` (404) for any non-existent id referenced in the path or the body. Add `NOT_FOUND` to `x-error-codes` and add a `404` response to these 4 operations. Update the precedence note: a body-id `NOT_FOUND` comes after body-shape `VALIDATION_ERROR`. |
| 2 | major | getOrder | BR-ROLE-04, BR-ROLE-06, US-12.9 | A CASHIER can `GET` **any** order by id, including other cashiers' PAID and CANCELLED orders from any date. BR-ROLE-06 only grants read access to "another cashier's open order on a table". US-12.9 says direct access to another cashier's order is allowed "only read-only through the tables flow". As written, the endpoint lets a cashier read all history by walking ids. | CASHIER: own orders → 200. Another cashier's order → 200 only while `status = OPEN` and `type = DINE_IN` (the tables flow). Otherwise → `FORBIDDEN_ROLE` (403), matching the Gate B default #1 used for shifts. Add `FORBIDDEN_ROLE` to `x-error-codes` and a `403` response. ADMIN is unchanged. |
| 3 | major (owner decision) | all (`ErrorCode` enum), ADR-0010 | BR-GEN-06, BR §9 | `INTERNAL_ERROR` (500) is in the enum, but BR §9 has 24 codes and no Arabic text for it. ADR-0010 itself says "`code` ∈ BR §9 (24 codes)". CLAUDE.md DoD requires Arabic messages from §9. So the Arabic text shown for a 5xx has no approved source. | The owner approves Gate B default #3. The PA then adds `INTERNAL_ERROR \| 500 \| حدث خطأ غير متوقع، حاول مرة أخرى` to §9 in BR v1.3, marked "technical, not a business rejection". Until then, keep the enum value but mark it as pending BR v1.3. |
| 4 | minor (owner decision) | OrderLineInput, OrderLineUpdateInput, OrderCancel, Settings*, User*, Category*, Item* | BR-ORD-02, BR-ORD-09, BR-SET-01, BR §2 | These length and range limits are not in BR: `qty` ≤ 999, cancel `reason` ≤ 200, `business_name` ≤ 80, `receipt_footer` ≤ 200, user `name` ≤ 100, category `name` ≤ 50, item `name` ≤ 80. None contradicts BR, but each one is a new input rejection that QA will test. `qty ≤ 999` narrows BR-ORD-02 ("integer ≥ 1"). | The owner confirms (see §3, D2). The PA then records the limits in BR §2 (v1.3) so tests can cite a rule ID. The contract does not change. |
| 5 | minor | createOrder, updateOrder, cancelOrder, payOrder | AC-03, AC-05, AC-07, AC-08, AC-10 | The global precedence puts all body `VALIDATION_ERROR` before ownership and state, but it does not order the business codes against each other. Examples: `NO_OPEN_SHIFT` vs `ORDER_EMPTY`, `DISCOUNT_INVALID`, `ITEM_INACTIVE`, `TABLE_INACTIVE` and `TABLE_OCCUPIED` on create; where `IDEMPOTENCY_CONFLICT` and replay sit on pay. Tests that send more than one fault get a non-deterministic code. | State the full order per operation. Suggested for create: `NO_OPEN_SHIFT` → `ORDER_EMPTY` → `NOT_FOUND` (ids) → `ITEM_INACTIVE` → `TABLE_INACTIVE` → `TABLE_OCCUPIED` → `DISCOUNT_INVALID`. For pay: the idempotency lookup (replay / `IDEMPOTENCY_CONFLICT`) runs right after the row lock and before owner, shift and state checks (as ADR-0007 already says). |
| 6 | minor | payOrder (PaymentCreate) | BR-PAY-02, OQ-27 | `amount_received_minor` has no `minimum: 0`, so a negative CASH amount returns `INSUFFICIENT_CASH` instead of `VALIDATION_ERROR`. OQ-27 says cash inputs are ≥ 0. | Add `minimum: 0`. A negative value → `VALIDATION_ERROR`. |
| 7 | minor | payOrder | BR-PAY-04, ADR-0007 | The contract says "same key + different **body** → `IDEMPOTENCY_CONFLICT`". ADR-0007 also puts the path `order_id` in the hash, so reusing a key on another order is also a conflict. That matches the intent of BR-PAY-04, but the contract does not say it. A missing or malformed key → `VALIDATION_ERROR` (ADR-0007 §1) is also not stated in the contract. | Add both sentences to the `payOrder` description and to the `IdempotencyKey` parameter. |
| 8 | minor | listOrders | BR-ROLE-04 | For a CASHIER, `shift_id` pointing at another cashier's shift is unspecified. `cashier_id` of another cashier is specified (`FORBIDDEN_ROLE`). | Treat it the same way: another cashier's `shift_id` → `FORBIDDEN_ROLE`. |
| 9 | minor | updateOrder | BR-ORD-08, BR-ITEM-03, OQ-18, OQ-23 | Three cases are unspecified: (a) a line `id` that does not belong to this order; (b) an existing line `id` sent with a different `item_id`; (c) a body that includes `type` or `table_id` (OQ-18 forbids changing them). Also unspecified: whether the note of a DISABLED item's existing line may change (OQ-23 only covers qty and re-add). | (a) → `VALIDATION_ERROR`; (b) → `VALIDATION_ERROR`; (c) → `VALIDATION_ERROR` (reject, do not ignore). A note change on a disabled item's line is allowed, because it neither raises qty nor re-adds the item. |
| 10 | minor | updateUser, refreshSession, ADR-0011 | BR-AUTH-02, OQ-31 | ADR-0011 and `refreshSession` revoke sessions on a **role** change as well. BR and OQ-31 only require revocation on disable and on password change. `updateUser` does not mention it. This is a user-visible side effect (forced re-login) that no rule states. | PA ruling: accepted as a security measure, because a stale role must never authorize a call (BR-ROLE-05). Document it in the `updateUser` description so QA can test it. No BR change. |
| 11 | minor | closeShift | BR-SHIFT-08, Gate B D5 | Closing an already CLOSED shift → `NO_OPEN_SHIFT`, whose message is "يجب فتح وردية أولًا". If the caller has since opened a new shift, this message is misleading. | Accepted (see §3, D5). The frontend may show the §9 text. No change to the contract. |
| 12 | minor | getOrderReceipt | BR-PAY-07, BR §9, Gate B D5 | A non-PAID order → `NOT_FOUND`. Under the global precedence, a non-owner still gets `NOT_ORDER_OWNER` first, but the description does not say so. | Add: "ownership is checked before the PAID check". |
| 13 | minor | all 429s (ADR-0009 generic throttles) | BR-AUTH-03, §9 `TOO_MANY_ATTEMPTS` | The §9 message says "حاول بعد 5 دقائق", but generic throttles use per-minute windows. BR has no rule for throttling authenticated business endpoints, so a throttle must never block normal cashier work. | Accepted (D6), on condition that the `RATELIMIT_USER`/`RATELIMIT_ANON` defaults stay well above normal POS traffic. The UI shows the §9 text verbatim. |
| 14 | minor | — (docs/traceability.md) | AC-06, AC-09, AC-10, AC-11, AC-12, AC-13, BR-GEN-03 | AC-12 and AC-13 are marked "— (UI)", but they are API-testable (`updateUser`, `login`). Missing operations: AC-09 lacks `updateItem`, `getOrder`, `createOrder`; AC-10 lacks `deleteItem`, `deleteCategory`, `updateItem`, `updateCategory`; AC-11 lacks `listUsers`, `cancelOrder`; AC-06 lacks `listOrders`, `listTables`, `getCurrentShift`, `closeShift`. BR-GEN-03 is marked UI-only, but it is enforced by every computing operation. BR-ROLE-04 lacks `getOrder` (after fix #2). | The team-lead updates `docs/traceability.md`. |

## 3. Gate B defaults (team-lead): BR consistency and owner-decision flags

| # | Default | Contradicts BR? | Needs owner decision? | PA position |
|---|---|---|---|---|
| D1 | A CASHIER reading another cashier's shift → `FORBIDDEN_ROLE`, and an unknown id → `NOT_FOUND`. The same `FORBIDDEN_ROLE` applies to another cashier's `cashier_id` on `/api/orders` and `/api/shifts`. | No. It is literally US-04.6, and it matches US-15.2 ("rejects") and US-23.5. | **No**: already fixed by Gate A-approved stories. | Accept. Apply it to `getOrder` too (#2). |
| D2 | Text and qty limits (80/200/100/50/80/200, qty ≤ 999). | No, but they are new constraints, and `qty ≤ 999` narrows BR-ORD-02. | **Yes**: new user-visible input rejections. | Recommend approving as-is. After approval the PA adds them to BR §2 (v1.3). |
| D3 | `INTERNAL_ERROR` (500) "حدث خطأ غير متوقع، حاول مرة أخرى", plus the offline banner "لا يوجد اتصال بالإنترنت — لا يمكن تنفيذ العمليات حتى يعود الاتصال". | No conflict with a rule. However, `INTERNAL_ERROR` is outside §9, and BR-GEN-06 plus the DoD require §9 texts. The offline banner is consistent with BR §0 and US-11.20: no offline queueing. | **Yes**: §9 must be edited (BR v1.3), and both are new user-facing Arabic texts. | Recommend approving both texts as-is (#3). |
| D4 | The fixed category icon set is the 20 `CategoryIcon` keys. | No. BR-ITEM-07 requires a fixed set but does not list its contents. | **Yes**: this is product content the owner sees in the admin UI. It is low risk. | Recommend approving the 20 keys as-is. Adding a key later is additive. Removing a key would need a data migration and a new decision. |
| D5 | Closing a CLOSED shift → `NO_OPEN_SHIFT`. A receipt for a non-PAID order → `NOT_FOUND`. | No. BR-SHIFT-08 already forbids the close (only the code is chosen). A receipt exists only for a PAID order (BR-PAY-07), so "resource does not exist" fits §9 `NOT_FOUND`. | **No**: a PA ruling on code mapping within existing rules. | Accept (#11, #12). |
| D6 | Every 429 → `TOO_MANY_ATTEMPTS`. | No. §9 has only one 429 code. | **No**. | Accept, with the #13 caveat. |

## 4. Out-of-scope guard (BR §0)

Nothing out of scope was found. There are no split payments (one Payment per order, method enum CASH|CARD), no refunds, no inventory, no charts (`getAdminDashboard` returns counts only), no offline order endpoint, no multi-branch fields, no logo or currency setting, and no tax fields on the receipt.

## 5. Verdict

**APPROVE WITH FIXES.**

- Blockers: none.
- Majors that must be fixed before Gate B is presented to the owner:
  - #1: unknown ids in the body → `NOT_FOUND`.
  - #2: restrict CASHIER `getOrder`.
  - #3: `INTERNAL_ERROR` needs owner approval and a BR v1.3 §9 entry.
- The minors (#4–#14) can be fixed in the same contract revision. #4 only needs owner approval.
- Owner decisions to request at Gate B: D2 (limits), D3 (`INTERNAL_ERROR` + offline texts), D4 (icon set). D1, D5 and D6 need no owner decision.
- After the owner decides, the PA will issue BR v1.3 (§2 limits, §9 `INTERNAL_ERROR`) with a changelog line. No rule ID will be renumbered.

## 6. Resolution (Gate B approved 2026-09-29)

- D2, D3 and D4 were approved as proposed → BR v1.3, OQ-41, OQ-42, OQ-43.
- #1 was accepted → BR §9 `NOT_FOUND` covers ids in the body (OQ-44).
- #2 was accepted in this form: a CASHIER reads another cashier's order only while it is **OPEN** (any type; the DINE_IN restriction proposed above was not adopted); otherwise `FORBIDDEN_ROLE` (BR-ROLE-06, OQ-45).
- #3 was resolved by adding `INTERNAL_ERROR` 500 to §9 (OQ-42).
- D1, D5 and D6 were recorded as OQ-46.
