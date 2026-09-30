# ADR-0007 — Idempotency storage for payments (BR-PAY-04)

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-PAY-04, BR-PAY-01, BR-ORD-08, §9 `IDEMPOTENCY_CONFLICT`; AC-07; US-13.6, US-13.6a, US-13.7, US-24.3, US-14.5

## Decision
1. `POST /api/orders/{id}/payment` **requires** the header `Idempotency-Key` (8–128 chars, `[A-Za-z0-9_-]`; the PWA
   sends a UUID v4 generated once per payment attempt on screen 13). Missing/invalid → `VALIDATION_ERROR`.
2. Table `payments_idempotencykey`:
   `id`, `user_id` (FK), `key` (varchar 128), `order_id` (FK), `request_hash` (char 64), `response_status` (int),
   `response_body` (jsonb), `created_at`. `UniqueConstraint(user, key)`.
3. `request_hash = sha256(canonical JSON of {"order_id", "method", "amount_received_minor"})` — keys sorted,
   no whitespace, absent fields as `null`. The order id is part of the hash, so reusing a key on another order is a
   conflict.
4. Algorithm, all inside the payment transaction of ADR-0006:
   1. `SELECT … FOR UPDATE` the order (serialises every payment attempt on that order, including same-key duplicates).
   2. Look up `(user, key)`:
      - found, same hash → return the stored `response_status` + `response_body` with header `Idempotent-Replayed: true`.
        No new row, no state change.
      - found, different hash → `409 IDEMPOTENCY_CONFLICT`.
   3. Not found → run the normal checks (role, owner, shift, OPEN status, method rules). On success insert the Payment,
      mark the order PAID and insert the idempotency row with the success response, then commit.
   4. **Rejections are not stored**: a 4xx (e.g. `INSUFFICIENT_CASH`) leaves no idempotency row, so the cashier can fix
      the amount and retry with the same key.
5. A second request with a **different** key on a PAID order hits step 3 → `ORDER_NOT_EDITABLE` (AC-07).
6. Retention: rows are kept (tiny volume; they double as an audit of payment attempts). No cleanup job in the MVP.
7. Concurrency proof: the unique `(user, key)` constraint plus the order row lock plus the one-to-one Payment constraint
   (ADR-0006) — three independent guards. QA automates AC-07 with parallel requests on the server.

## Consequences
- Screen 14 refresh (US-14.5) reads `GET /api/orders/{id}` / `GET /api/orders/{id}/receipt`; it never re-posts.
- The replayed response is byte-for-byte the original `data`, so the UI can treat a replay exactly like a first success.
