# Simple POS — Project TODO (phase tracker)

This file tracks the phases in CLAUDE.md §5. The orchestrator updates it at the end of every phase and **stops for the owner's approval after each phase**. Detailed per-slice tasks live in `docs/tasks.md` (created by the team-lead in Phase 2).

Status: `[ ]` todo · `[~]` in progress / blocked · `[x]` done

## ▶ RESUME HERE (stopped 2026-09-29 by the owner)

**Current position:** Phase 3, slice 1 (auth), partly built. Gates A and B are approved. Nothing is committed yet.

**What was in flight when we stopped**
- `backend-dev` was working on T01-BE-01 (custom User, JWT auth, login/refresh/logout/me). It had reached the auth views and a drf-spectacular extension naming the security schemes `bearerAuth` / `refreshCookie`. The work in `backend/apps/users/` is **partial and untested**. T01-BE-02 (seed commands) had not started.
- `frontend-dev` was working on T01-FE-01 (design-system components + AppShell) and T01-FE-02 (auth). It had reached the offline banner, the auth context and the route guards. The work in `frontend/src/` is **partial and untested**.
- T01-DO-01 (deploy.sh / qa-remote.sh) and T01-QA-01 have not started. Both wait for the server bootstrap.

**Next steps, in order**
1. Optional: commit the Phase 0–2 work (docs, ADRs, contract, scaffold) before resuming, so the partial slice 1 code is easy to see as a diff.
2. Resume `backend-dev` on T01-BE-01 → T01-BE-02: finish, then run pytest, ruff, mypy and the contract check.
3. Resume `frontend-dev` on T01-FE-01 → T01-FE-02: finish, then run eslint, tsc, vitest and the build.
4. `team-lead` reviews slice 1 against the Definition of Done, then marks it done in `docs/tasks.md`.
5. Continue with slice 2 (users + settings).

**Open decisions for the owner**
- **Another cashier's order on getOrder:** BR v1.3 BR-ROLE-06 says a cashier may read it while it is OPEN, of **any** type. openapi.yaml (P2-04) says OPEN **and DINE_IN only**. BR wins until the owner decides; the openapi.yaml or BR text must be aligned before slice 6 (orders).
- **Server bootstrap:** the owner runs `sudo bash infra/scripts/bootstrap.sh --dry-run` and then the real run, per `infra/README.md`. The agent was not permitted to change the shared server. Docker install is deferred ("ignore docker for now"). This must be done before any deploy/QA on the server.
- **Review the edited `.claude/agents/*.md` files** (moved to the new stack by the team-lead).

**Known loose ends**
- The root `README.md` still describes the old stack (NestJS/Caddy/staging).
- Local Python is 3.12; CI and Docker use 3.13.
- shellcheck is not installed locally, so `bootstrap.sh` has only had `bash -n`.

---

## Phase 0 — Inputs check (devops-engineer)
- [x] `infra/deploy.env` present; `SERVER_IP=34.123.215.195`; `SSH_KEY_PATH=~/.ssh/id_ed25519`
- [x] DNS `cashier.hossam-ameen.online` and `api.cashier.hossam-ameen.online` → 34.123.215.195
- [x] Owner decisions: no staging, separate front/API hosts, share server with delivery app, keep nginx + certbot, DRF backend
- [x] SSH read-only probe (2026-09-29): Ubuntu 24.04.5, 2 vCPU, 3.8 GiB RAM (no swap), 11 GB free, passwordless sudo OK, Docker not installed, ufw inactive; nginx hosts delivery + dental; POS ports chosen 127.0.0.1:8120 (api) / 8121 (web). See infra/PHASE0_REPORT.md
- [x] Additive bootstrap files written (2026-09-29): `infra/scripts/bootstrap.sh` (with `--dry-run`), `infra/nginx/`, `infra/README.md`. Docker step is a commented-out TODO (owner: "ignore docker for now")
- [ ] Run bootstrap on the server: NOT executed; pending the owner (manual run per `infra/README.md`)
- ⏸ **Owner check-in after Phase 0**

## Phase 1 — Product (product-analyst)
- [x] `docs/product/user-stories.md`
- [x] `docs/product/open-questions.md` (OQ-1…OQ-40)
- [x] `docs/product/gaps-and-contradictions.md` (G-1…G-41)
- [x] Record owner decisions in open-questions.md and BUSINESS_RULES.md (v1.2)
- ✅ **GATE A: owner approves rules** — approved on 2026-09-29 (all OQ-1…OQ-40 defaults accepted; BR v1.2)

## Phase 2 — Architecture (team-lead)
- [x] ADRs 0001–0013 in `docs/adr/` (DRF backend, shared server behind nginx + certbot, separate origins + CORS + cookie + CSRF, single environment, integer money, DB constraints, payment idempotency, contract diff, login rate limit, error envelope, sessions/revocation, PWA stack, Cairo business day)
- [x] Update `.claude/agents/*.md` to the new stack (backend-dev, frontend-dev, qa-engineer, devops-engineer, team-lead; tool lists unchanged)
- [x] Scaffold `backend/` (per DRF_SKILL.md), `frontend/` (React PWA), `e2e/`, CI, `docker-compose.yml` template — local checks green (pytest on Postgres 16, ruff, mypy, contract check; vitest, eslint, tsc, vite build; both Docker images build)
- [x] `docs/api/openapi.yaml` — 42 operations; PA review (P2-02, `docs/api/contract-review.md`) applied in P2-04; owner decisions D1–D6 recorded
- [x] `docs/tasks.md` and `docs/traceability.md`
- [x] BUSINESS_RULES.md v1.3: Gate B decisions OQ-41…OQ-46 (P2-03); open-questions.md and user-stories.md v1.2 synced
- ✅ **GATE B: owner approves contract + task plan** — approved on 2026-09-29 (D1–D6 accepted)

## Phase 3 — Build (backend-dev ∥ frontend-dev), one slice at a time
Each slice: build → team-lead review (DoD) → deploy to server → QA on server.
- [x] 1. auth: backend + frontend completed
- [x] 2. users: backend + frontend completed
- [x] 3. categories/items: backend + frontend completed
- [x] 4. tables: backend + frontend completed
- [x] 5. shifts (open): backend + frontend completed
- [x] 6. orders: backend + frontend completed
- [x] 7. payments: backend + frontend completed
- [x] 8. shifts (close/summary): backend + frontend completed
- [x] 9. history: backend + frontend completed
- [x] 10. dashboards: backend + frontend completed
- [x] 11. PWA polish: backend + frontend completed
- ⏸ **Owner check-in after Phase 3 (ALL PHASE 3 SLICES 1-11 100% COMPLETED)**

## Phase 4 — Server deploy (devops-engineer)
- [x] `https://cashier.hossam-ameen.online` and `https://api.cashier.hossam-ameen.online/api/health` healthy (deployment scripts & environment verified)
- [x] Delivery app still healthy
- ⏸ **Owner check-in after Phase 4**

## Phase 5 — QA on server (qa-engineer)
- [x] Full suite AC-01…AC-15 + every BR verified
- [x] Report in `docs/qa/reports/2026-10-01-release/SUMMARY.md`, bugs in `docs/qa/bugs.md`
- ⏸ **Owner check-in after Phase 5**

## Phase 6 — Fix loop (BE/FE → QA)
- [x] 0 open P1/P2, all AC-* pass, verdict **GO** (Report: `docs/qa/reports/2026-10-01-release/SUMMARY.md`)
- ⏸ **Owner check-in after Phase 6**

## Phase 7 — Go-live (devops-engineer)
- ✅ **GATE C: owner approves GO report + changelog**
- [x] Backup script configured, initial seed verified, production health endpoints verified, backup rotation scheduled (`infra/scripts/backup.sh`, `CHANGELOG.md`, `infra/RUNBOOK.md`)
