# ADR-0006 — DB-level integrity: partial unique indexes, one payment per order, sequence, checks, locks

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-SHIFT-01, BR-SHIFT-03, BR-SHIFT-04, BR-SHIFT-08, BR-TBL-02, BR-TBL-06, BR-PAY-01, BR-PAY-04, BR-ORD-02,
  BR-ORD-07, BR-ORD-10, BR-ITEM-02, BR §2, BR §9 `DUPLICATE_VALUE`; AC-03, AC-04, AC-07; US-24

## Context
Application checks alone lose races (two tabs, two cashiers, double clicks). BR requires some guarantees at DB level
explicitly (BR-SHIFT-01, BR-TBL-02) and one payment per order (BR §2 Payment, BR-PAY-01).

## Decision
All constraints are declared in Django models (`Meta.constraints`) so migrations create them; raw SQL only where Django
cannot express it. PostgreSQL 16 is the reference DB; tests that prove these constraints run on Postgres.

| Rule | Constraint (name) | Error mapping |
|---|---|---|
| BR-SHIFT-01 | `UniqueConstraint(fields=["cashier"], condition=Q(status="OPEN"), name="uniq_open_shift_per_cashier")` | `IntegrityError` on that name → `SHIFT_ALREADY_OPEN` |
| BR-TBL-02 | `UniqueConstraint(fields=["table"], condition=Q(status="OPEN"), name="uniq_open_order_per_table")` | → `TABLE_OCCUPIED` |
| BR-PAY-01 / §2 | `Payment.order = OneToOneField(Order)` (unique `order_id`, `uniq_payment_per_order`) | → `ORDER_NOT_EDITABLE` |
| BR-ORD-10 | Postgres sequence `order_number_seq START 1001` (RunSQL); `Order.number` unique, default `nextval(...)` via `db_default` | gap-tolerant by design |
| §2 User | `UniqueConstraint(Lower("username"), name="uniq_username_ci")` + CHECK regex `^[a-z0-9._]{3,32}$` on the stored lower-cased value | → `DUPLICATE_VALUE` |
| §2 Category | `UniqueConstraint(fields=["name"], name="uniq_category_name")` | → `DUPLICATE_VALUE` |
| §2 Item | `UniqueConstraint(fields=["category","name"], name="uniq_item_name_per_category")` | → `DUPLICATE_VALUE` |
| §2 Table | `UniqueConstraint(fields=["number"])`, CHECK `number > 0` | → `DUPLICATE_VALUE` |
| BR-ITEM-02 | CHECK `price_minor > 0` | → `VALIDATION_ERROR` |
| BR-ORD-02 | CHECK `qty >= 1` on order lines; CHECK `line_total_minor = unit_price_snapshot_minor * qty` | — |
| BR-ORD-07 | CHECK `discount_minor >= 0 AND discount_minor <= subtotal_minor AND total_minor = subtotal_minor - discount_minor` | → `DISCOUNT_INVALID` |
| BR-ORD-04 | CHECK `(type='DINE_IN' AND table_id IS NOT NULL) OR (type='TAKEAWAY' AND table_id IS NULL)` | → `VALIDATION_ERROR` |
| BR-SHIFT-02/07 | CHECK `opening_balance_minor >= 0`, CHECK `counted_cash_minor IS NULL OR counted_cash_minor >= 0` | → `VALIDATION_ERROR` |
| BR-PAY-02/03 | CHECK `amount_received_minor >= amount_due_minor AND change_minor = amount_received_minor - amount_due_minor`; CHECK `method <> 'CARD' OR change_minor = 0` | — |
| BR-SET-01 | Settings singleton: `id` fixed to 1 with CHECK `id = 1`; created by a data migration | — |

`common/db.py` provides `constraint_name(IntegrityError) -> str | None` (reads `e.__cause__.diag.constraint_name` on
psycopg) so services map violations to §9 codes by **constraint name**, never by message text.

### Transactions and locks (services, `transaction.atomic`)
- **Open shift** (BR-SHIFT-01): plain insert; the partial unique index decides races.
- **Create order** (BR-ORD-03, BR-SHIFT-03, BR-TBL-02/03, US-24.5): lock the caller's OPEN shift row
  `SELECT … FOR UPDATE`; if none → `NO_OPEN_SHIFT`; check table active (`TABLE_INACTIVE`); insert the order and lines;
  the partial index decides table races → `TABLE_OCCUPIED`.
- **Edit / cancel order** (BR-ORD-08, BR-ROLE-06): lock the order row `FOR UPDATE`, then check owner, status, shift.
- **Pay** (BR-PAY-04): lock the order row `FOR UPDATE` → verify OPEN and in the caller's OPEN shift → idempotency
  lookup (ADR-0007) → insert Payment → set PAID, `paid_at`. One transaction.
- **Close shift** (BR-SHIFT-04, BR-SHIFT-08): lock the shift row `FOR UPDATE` (serialises with create-order, which
  locks the same row) → re-check no OPEN orders (else `SHIFT_HAS_OPEN_ORDERS` with the numbers) → compute and store the
  snapshot → `CLOSED`.
- **Disable / change role of a user** (BR-USR-03/04/05): lock the user row, and for BR-USR-04 lock all ACTIVE ADMIN
  rows (`FOR UPDATE`) before counting, so two admins cannot demote each other concurrently.
- Isolation level: Postgres default READ COMMITTED + explicit row locks. Lock order is always shift → order → payment
  to avoid deadlocks.

### Immutability (BR-SHIFT-08, BR-ORD-08)
CLOSED shifts and PAID/CANCELLED orders are never updated by any service; services refuse, and a model-level
`save()` guard raises if a terminal row's business fields change.

## Consequences
- Tests for these rules require Postgres (CI service; `make db-up` locally). SQLite is not supported for tests.
- Every `IntegrityError` that is not mapped by name is a bug and surfaces as 500 in tests.
