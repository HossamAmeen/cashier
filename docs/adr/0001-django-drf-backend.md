# ADR-0001 — Django/DRF backend per DRF_SKILL.md (replaces NestJS/Prisma)

- Status: Accepted (team-lead, 2026-09-29, task P2-01)
- Supersedes: the NestJS/Prisma/pnpm-monorepo stack in the original CLAUDE.md §4
- Refs: owner decision 2026-09-28 (infra/PHASE0_REPORT.md), CLAUDE.md §4, DRF_SKILL.md, PA note N-1

## Context
The owner decided on 2026-09-28 that the backend follows `DRF_SKILL.md` (Django REST Framework) instead of NestJS + Prisma.
The owner's other apps on the shared server (delivery, dental) are also Django/gunicorn, so the operator already knows
this stack. The original plan relied on a cross-language `packages/shared` (TypeScript types, money utils, error codes)
used by both API and web; that no longer works with a Python backend.

## Decision
1. **Repo layout** (monorepo, no cross-language shared package):
   - `backend/` — Django project per DRF_SKILL.md §3: `config/settings/{base,development,production,test}.py`,
     domain apps in `backend/apps/`, shared infrastructure in `backend/common/`, pytest config, `Makefile`, `Dockerfile`.
   - `frontend/` — React PWA (pnpm).
   - `e2e/` — Playwright (pnpm).
   - `infra/` — owned by devops (deploy scripts, nginx server blocks, backups, QA runner).
   - `docs/`.
   The root `pnpm-workspace.yaml` covers only `frontend` and `e2e`.
2. **Stack**: Python 3.13 (Docker image and CI), Django 5.2, DRF 3.16, simplejwt, django-environ + dj-database-url,
   drf-spectacular, django-filter, django-cors-headers, django-jazzmin, argon2-cffi, gunicorn, PostgreSQL 16.
   Pinned versions live in `backend/requirements/`. `development.txt` additionally pins `psycopg[binary]` because
   tests run against a real Postgres (CLAUDE.md §4).
3. **Domain apps** (created slice by slice by backend-dev, not in the scaffold): `users` (custom `AUTH_USER_MODEL`,
   auth, login throttle, cashier projection), `store_settings` (Settings singleton), `catalog` (categories, items),
   `tables`, `shifts`, `orders`, `payments`, `dashboard`. `apps/health` exists in the scaffold.
   Business workflows live in `services.py`, reads in `selectors.py` (DRF_SKILL §16).
4. **Shared artifacts that were in `packages/shared` move to**:
   - error-code catalogue → `backend/common/error_codes.py` (server) and `frontend/src/lib/errors.ts` (Arabic UI map);
     both are tested against the `ErrorCode` enum in `docs/api/openapi.yaml`;
   - API types → generated into `frontend/src/api/schema.d.ts` from `docs/api/openapi.yaml` (ADR-0012);
   - money helpers → `backend/common/money.py` and `frontend/src/lib/money.ts` (ADR-0005).
5. **Deliberate deviations from DRF_SKILL.md** (the skill says "may be adapted"):
   | Skill section | Deviation | Why |
   |---|---|---|
   | §11–13 soft delete (`deleted_at`, `ActiveManager`) | `BaseModel` has `created_at` + `modified_at` only; no `deleted_at` | BR-GEN-04/BR-ITEM-04/BR-ITEM-05 define the lifecycle: `status`/`is_active` for disable, hard delete only for never-used items and empty categories. A soft-deleted row would still collide with the uniqueness rules in BR §2 and §9 `DUPLICATE_VALUE`. |
   | §19 response format | Error envelope is `{success, code, message, details}` instead of `{success, message, errors}` | BR-GEN-06 requires a stable machine code per rejection (ADR-0010). |
   | §17 `POST /api/auth/token/` | `POST /api/auth/login`, `/refresh`, `/logout`, refresh token in an httpOnly cookie | CLAUDE.md §4 (refresh in cookie), ADR-0011. |
   | §41 `docker/{local,staging,production}` | One `backend/Dockerfile`; one root `docker-compose.yml` template | Single environment (ADR-0004); devops owns the server copy in `infra/`. |
   | §46–50 `backend/deploy/` (nginx, systemd, scripts) | Lives in `infra/` (devops-owned); no systemd (containers) | CLAUDE.md §3 ownership; ADR-0002. |
   | §28–33 Celery/Redis | Not used (`CELERY_ENABLED` absent) | No background work in the MVP; the host has 3.8 GiB RAM (PHASE0 W1). |
   | §70–71 Redis throttle cache | Django `DatabaseCache` (Postgres) | Shared across gunicorn workers without adding Redis (ADR-0009). |
   | §24 health password in query | Header `X-Health-Check-Token` preferred; `?password=` still accepted | Skill §24 prefers the header for production. |
6. **Quality gates**: `ruff check`, `ruff format --check`, `mypy` (django-stubs), `python manage.py check`,
   `makemigrations --check`, `pytest` against Postgres, contract diff (ADR-0008). Test names cite BR IDs
   (e.g. `test_br_pay_02_rejects_cash_below_total`).

## Consequences
- The contract (`docs/api/openapi.yaml`) is the only interface shared by backend and frontend.
- Backend-dev must create the custom `users.User` model and set `AUTH_USER_MODEL` in slice 1 **before any migration is
  applied to any persistent database**; the scaffold deliberately has no persistent DB yet.
- CLAUDE.md §4/§6/§7 were already updated by the owner/orchestrator to this stack; the agent files are updated in P2-01.
- Local Python may be 3.12 for editing; CI and Docker use 3.13 as the reference interpreter.
