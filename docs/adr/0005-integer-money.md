# ADR-0005 — Money as integer minor units end to end (BR-GEN-01)

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-GEN-01, BR-GEN-03, BR-ITEM-02, BR-ORD-06, BR-ORD-07, BR-PAY-02, BR-SHIFT-05..07, OQ-27, OQ-34

## Decision
1. **Unit**: piastres (1 EGP = 100). Every money value in DB, Python, JSON and TypeScript is an integer.
2. **Database**: `BigIntegerField` for every money column, named `*_minor`, with `CHECK` constraints for the ranges in
   BR (ADR-0006). Never `FloatField` or `DecimalField` for money.
3. **API**: every money field is `type: integer, format: int64` and its name ends in `_minor`
   (`price_minor`, `total_minor`, `amount_received_minor`, …). The API never accepts or returns a decimal string or
   float for money. The contract check (ADR-0008) and a unit test assert the naming rule.
4. **Input conversion** (BR-ITEM-02, OQ-27: at most 2 decimals): the **client** converts the typed string to minor units
   with string parsing, never with `parseFloat` × 100:
   `frontend/src/lib/money.ts → parseToMinor("45.5") === 4550`, `"45.505"` → rejected. The server additionally has
   `backend/common/money.py → to_minor(str)` for seeds/admin, using `Decimal` only for parsing, returning `int`.
5. **Calculations** happen only on the server (BR-GEN-03) with Python `int`:
   `line_total = unit_price × qty`; `subtotal = Σ line_total`; `total = subtotal − discount`;
   `change = received − total`; `expected_cash = opening + cash_total`; `difference = counted − expected`.
   A percentage discount is converted on the client (BR-ORD-07): `round_half_up(subtotal × pct / 100)` implemented
   with integer arithmetic only (`(subtotal_minor * pct + 50) // 100` for a whole-number pct), and the server only
   receives `discount_minor`.
6. **Display** (OQ-34): 2 decimals, thousands separator, Western digits, label `ج.م`
   (`formatMinor(485000) → "4,850.00"`). Negative differences render with a leading `−`.
7. **Types**: frontend money values use the alias `type Minor = number` and are validated with
   `Number.isSafeInteger`; `any` is forbidden in money code (CLAUDE.md §6). 2^53−1 piastres is far above any realistic
   POS amount.

## Consequences
- No rounding bugs; totals are exact and reproducible (AC-01, AC-02 are checked to the piastre).
- Every form that accepts money must use `parseToMinor`; code review rejects `parseFloat` near money.
