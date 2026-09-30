# ADR-0008 — Contract-first `docs/api/openapi.yaml` + CI diff against drf-spectacular

- Status: Accepted (team-lead, 2026-09-29)
- Refs: CLAUDE.md §2 (precedence), §4 (API contract), §6 (DoD); DRF_SKILL.md §21, §56

## Decision
1. `docs/api/openapi.yaml` (OpenAPI 3.0.3) is **hand-written** by the team-lead, reviewed by the product-analyst, and
   approved by the owner at GATE B. After GATE B it changes only through the team-lead (a PR that cites the BR/OQ
   reason); backend-dev and frontend-dev propose changes, never edit it silently.
2. Contract conventions:
   - base path `/api`, **no trailing slashes** (`APPEND_SLASH=False`; DRF routers use `trailing_slash=False`);
   - JSON field names in `snake_case`; ids are integers; timestamps are RFC 3339 UTC strings (`...Z`);
   - money fields are `integer/int64` named `*_minor` (ADR-0005);
   - every operation has a stable `operationId`, `x-roles` (allowed roles), `x-br` (BR IDs), and `x-error-codes`
     (the §9 codes it can return), and its `description` cites its BR IDs;
   - success bodies use the envelope of ADR-0010; errors use the `Error` schema whose `code` enum is exactly BR §9
     (plus the technical `INTERNAL_ERROR` for 5xx, pending PA confirmation).
3. **Backend conformance**: drf-spectacular generates the implementation's schema. Views set `operation_id`,
   parameters and serializers with `@extend_schema` to match the contract. A postprocessing hook
   (`common/schema.py`) wraps 2xx bodies in the success envelope so the shapes are comparable.
4. **Diff tool** `backend/scripts/contract_check.py` (`make contract-check`), run in CI:
   - validates the contract itself against the OpenAPI 3.0 JSON schema;
   - generates the spectacular schema and compares, per operation (`method + path`): existence, `operationId`,
     path/query/header parameters (name, location, required), JSON request-body shape, and each 2xx response shape;
   - "shape" = resolved `$ref`s, property names, types, `required`, `nullable`, `enum`, array items — descriptions,
     examples and numeric/length limits are ignored (limits are covered by tests);
   - any operation in the code but not in the contract **fails**;
   - operations in the contract not yet implemented are listed as `PENDING` and pass, until slice 11 when CI switches
     to `--strict` (all operations must exist);
   - differing 4xx status sets are reported as warnings.
5. The frontend never reads the spectacular schema; it generates its types from the **contract** (ADR-0012), so a
   green contract check means backend and frontend agree.

## Consequences
- Adding an endpoint is a two-step change: contract first (team-lead), then code.
- `/api/schema`, `/api/docs`, `/api/redoc` (spectacular) are served for convenience, and are excluded from the diff.
- The diff intentionally ignores cosmetic fields to avoid churn; limits (max lengths, minimums) must be tested.
