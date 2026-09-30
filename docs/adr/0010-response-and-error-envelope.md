# ADR-0010 — Response and error envelope carrying BR §9 codes

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-GEN-06, BR §9, OQ-40; DRF_SKILL.md §19–20; team-lead charter (error envelope `{code, message, details}`)

## Decision
### Success (2xx with a body)
```json
{ "success": true, "message": "OK", "data": { ... } }
```
`data` is the resource, a list page, or `null`. `message` is informational English and is never shown to users.
List pages: `data = { "items": [...], "pagination": { "page", "page_size", "total_items", "total_pages" } }`
(page-number pagination, `page_size` default 20, max 100). `204 No Content` has no body (logout, deletes).

### Error (4xx/5xx)
```json
{ "success": false, "code": "TABLE_OCCUPIED", "message": "الطاولة مشغولة بطلب آخر", "details": { } }
```
- `code` ∈ BR §9 (24 business codes + the technical `INTERNAL_ERROR`, owner-approved at GATE B D3, BR v1.3). The HTTP
  status is **always** the one BR §9 assigns to that code.
- `message` is the Arabic text from BR §9 verbatim (the UI still maps `code` → message itself, BR-GEN-06).
- `details` is an object, always present (may be `{}`). Known keys:
  - `fields`: `{ "<field path>": ["<english machine hint>", ...] }` for `VALIDATION_ERROR`
    (nested paths like `lines.0.qty`);
  - `open_order_numbers`: `[1047, 1049]` for `SHIFT_HAS_OPEN_ORDERS` (BR-SHIFT-04);
  - `retry_after_seconds` for `TOO_MANY_ATTEMPTS`;
  - `item_ids` for `ITEM_INACTIVE`; `field` for `DUPLICATE_VALUE`.
- 5xx: `code = INTERNAL_ERROR`, HTTP 500, "حدث خطأ غير متوقع، حاول مرة أخرى", no stack trace (GATE B D3).

### Mapping of framework exceptions (`common/exception_handler.py`)
| Raised | Code | HTTP |
|---|---|---|
| `common.exceptions.AppError(code)` | that code | per §9 |
| DRF `ValidationError`, `ParseError`, `UnsupportedMediaType` | `VALIDATION_ERROR` | 422 |
| `NotAuthenticated`, `AuthenticationFailed`, simplejwt `InvalidToken` | `UNAUTHENTICATED` | 401 |
| `PermissionDenied` (role permission classes) | `FORBIDDEN_ROLE` | 403 |
| `NotFound`, `Http404`, `MethodNotAllowed`, unknown URL | `NOT_FOUND` | 404 |
| `Throttled` | `TOO_MANY_ATTEMPTS` | 429 (+ `Retry-After`) |
| anything else | `INTERNAL_ERROR` | 500 (logged with request id) |

Django's `handler404`/`handler500` return the same JSON envelope. Views never format errors themselves.

### Precedence of checks inside one operation (so tests and UI are deterministic)
`UNAUTHENTICATED` → `FORBIDDEN_ROLE` (role) → `NOT_FOUND` (path id) → `VALIDATION_ERROR` (body shape) →
ownership (`NOT_ORDER_OWNER` / `FORBIDDEN_ROLE` for another cashier's shift or non-OPEN order) → state/business codes
(`NO_OPEN_SHIFT`, `ORDER_NOT_EDITABLE`, `TABLE_OCCUPIED`, …). A non-existent id referenced in the body → `NOT_FOUND`
(BR §9, US-23.8) after the body-shape check. Operations with several business codes list their exact order in the
contract (contract review #5).

## Consequences
- The frontend unwraps `data` in one place (`frontend/src/api/client.ts`) and maps `code` via `frontend/src/lib/errors.ts`.
- `backend/common/error_codes.py`, `frontend/src/lib/errors.ts` and the contract's `ErrorCode` enum are kept equal by
  tests on both sides.
