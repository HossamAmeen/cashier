# ADR-0004 — Single environment (no staging); QA on the server pre-launch only

- Status: Accepted (team-lead, 2026-09-29)
- Refs: owner decision 2026-09-28 ("no staging for now"), CLAUDE.md §5 (Phases 4–7), §7; PA note N-2

## Context
The original plan had `staging` and `production` on one server, with QA running on staging. The owner decided there is
one environment only, at `FRONT_DOMAIN` / `BACKEND_DOMAIN`, and QA results still only count when produced on the server.

## Decision
1. **One environment** on the server: `/opt/simple-pos/` with one compose project, one Postgres volume, one `.env`
   (mode 600, secrets generated on the server). There is no `APP_ENV=staging`.
2. `APP_ENV` has two values: `development` (laptops, CI) and `production` (the server). The server is `production` from
   day one, but in a **pre-launch** state until GATE C.
3. **Pre-launch flag**: `.env` carries `PRELAUNCH=true` until GATE C. The QA seed command
   (`python manage.py seed_qa`) refuses to run unless `PRELAUNCH=true`, and also refuses when `PRELAUNCH` is absent.
   It resets **only** POS data in its own DB (never another tenant's). The go-live step sets `PRELAUNCH=false`, wipes
   QA data (backup first) and runs `seed_initial` (real admin, settings, tables, catalogue).
4. **QA runner**: `infra/scripts/qa-remote.sh` (devops) deploys the SHA, runs `seed_qa`, then runs the Playwright
   container **on the server** with `BASE_URL=https://cashier.hossam-ameen.online` and
   `API_URL=https://api.cashier.hossam-ameen.online`, and copies reports to `docs/qa/reports/<date>-<sha>/`.
   `e2e/playwright.config.ts` throws if either URL points to localhost/127.0.0.1/0.0.0.0.
5. **After GATE C** QA must not write to the live DB. Re-running write-QA after launch needs a staging environment,
   which is an owner decision (a future ADR would supersede this one).
6. **Generous non-business throttles during QA**: the generic DRF rates (`RATELIMIT_*`) are env-configurable and may be
   raised in `.env` before a QA run. BR-AUTH-03's 5-per-5-minutes login limit is a business rule and is **not**
   configurable.

## Consequences
- No isolation between QA and the future real data other than time: go-live must wipe QA data (CLAUDE.md §5 Phase 7).
- Backups start before the first deploy (devops); a restore is tested once before GATE C.
- Local unit/integration tests (pytest, vitest, `vite build`) are allowed on laptops and CI; E2E/QA is never run
  against localhost.
