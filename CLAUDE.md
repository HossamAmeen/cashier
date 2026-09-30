# Simple POS — Project Constitution

This file is read by every agent at the start of every session. Follow it exactly.

## 1. What we are building
We are building a simple Arabic RTL cashier / POS system for a small restaurant or café. It has:
- a web app installable as a **PWA**
- a REST backend
- a PostgreSQL database
- deployment to a real server: the PWA at `https://cashier.hossam-ameen.online` (`FRONT_DOMAIN`) and the API at `https://api.cashier.hossam-ameen.online` (`BACKEND_DOMAIN`)

## 2. Sources of truth (strict precedence)
1. `docs/business/BUSINESS_RULES.md` — business logic. Rule IDs `BR-*`, acceptance scenarios `AC-*`.
2. `docs/api/openapi.yaml` — the API contract (contract-first; the backend implements it and the frontend consumes it).
3. `docs/design/Simple-POS-MVP-UIUX-Proposal.pdf` — screens 01–20, design system, flows.
4. Code.

When two sources conflict, the higher one wins. Never "fix" a conflict by editing a higher source from a lower role; raise it to the **product-analyst**, and to the human owner if it touches business rules.

## 3. Team (Claude Code subagents in `.claude/agents/`)
| Agent | Owns | Never does |
|---|---|---|
| `product-analyst` | BUSINESS_RULES.md, user stories, acceptance criteria, open questions | write app code |
| `team-lead` | architecture, ADRs, repo scaffold, OpenAPI contract, task board, code review, merge gate | skip gates |
| `backend-dev` | `backend/` (Django/DRF), models/migrations, seeds, API tests | change the contract silently |
| `frontend-dev` | `frontend/` (React PWA), screens 01–20, RTL design system | compute authoritative money |
| `qa-engineer` | `e2e/`, API + UI test suites, QA reports, bug log | run tests against localhost |
| `devops-engineer` | `infra/`, server bootstrap, DNS/TLS, deploy, backups, the server-side QA runner | commit secrets |

## 4. Tech stack (decided — change only through an ADR by team-lead)
- **Repo layout** (monorepo, no shared package across languages):
  - `backend/` — Django/DRF project, structured per `DRF_SKILL.md` (domain apps in `backend/apps/`, shared infra in `common/`)
  - `frontend/` — React PWA (pnpm)
  - `e2e/` — Playwright suites (pnpm)
  - `infra/`
  - `docs/`
- **Backend**: follows `DRF_SKILL.md` (owner decision, 2026-09-28; replaces NestJS/Prisma). Python 3.13+, Django 5.2, Django REST Framework, PostgreSQL 16 (SQLite allowed for local dev only), django-environ, simplejwt (access token 15 min + refresh token in an httpOnly cookie), argon2 password hashing, django-cors-headers (CORS limited to `FRONT_DOMAIN`), drf-spectacular, gunicorn, structured JSON logs. Pinned versions live in `backend/requirements/`.
- **Frontend**: React 18 + TypeScript + Vite, React Router, TanStack Query, Tailwind CSS (design tokens from the PDF), `vite-plugin-pwa`, API client generated from `docs/api/openapi.yaml`, self-hosted **IBM Plex Sans Arabic**.
- **API contract**: contract-first. `docs/api/openapi.yaml` is hand-written and approved at Gate B. CI compares it with the drf-spectacular schema generated from the code.
- **Tests**:
  - pytest + pytest-django unit and API tests against a real Postgres (backend)
  - Vitest unit tests (frontend)
  - **Playwright** E2E + API suites in `e2e/`
- **Infra**:
  - Server `34.123.215.195` (Ubuntu), **shared with the live delivery app** (`delivery.hossam-ameen.online`). Never disrupt its nginx, ufw, sshd, or containers.
  - Docker + Docker Compose for the POS services, bound to localhost ports only
  - The existing **nginx** keeps ports 80/443 and gets new server blocks for `FRONT_DOMAIN` and `BACKEND_DOMAIN`, with TLS from **certbot** (no Caddy)
  - DNS is on Namecheap (records are added by hand)
  - **One environment only for now** (owner decision, 2026-09-28): no staging hosts, no staging DB. QA runs **on the server** against this environment

## 5. Workflow & gates
```
Phase 0  Inputs check (devops)      → infra/deploy.env present, SSH works, FRONT_DOMAIN + BACKEND_DOMAIN point to SERVER_IP
Phase 1  Product (PA)               → stories + AC mapped to BR IDs, open questions      ⛔ GATE A: owner approves rules
Phase 2  Architecture (TL)          → ADRs, scaffold, openapi.yaml, task board            ⛔ GATE B: owner approves contract
Phase 3  Build (BE ∥ FE)            → vertical slices in the order of docs/tasks.md
Phase 4  Server deploy (devops)     → https://$FRONT_DOMAIN and https://$BACKEND_DOMAIN/api/health healthy (pre-launch, test data only)
Phase 5  QA on server (QA)          → report in docs/qa/reports/, bugs in docs/qa/bugs.md
Phase 6  Fix loop (BE/FE → QA)      → until 0 open P1/P2 and all AC-* pass
Phase 7  Go-live (devops)           ⛔ GATE C: owner approves → wipe QA data, seed real data, schedule backups
```
At each ⛔ gate, stop and ask the human owner. Do not continue until the owner explicitly says "approved".

With a single environment, QA may only create test data **before go-live**. After Gate C, QA must not write to the live DB; running QA again after launch needs a staging environment, which is an owner decision.

**Vertical slice order**:
1. auth
2. users
3. categories/items
4. tables
5. shifts (open)
6. orders
7. payments
8. shifts (close/summary)
9. history
10. dashboards
11. PWA polish

## 6. Definition of Done (per task)
- Implements the cited `BR-*` rules. Every rule is enforced **server-side**.
- Unit tests exist for every business rule touched, and each test title contains its BR ID.
- The API matches `openapi.yaml`: the contract diff check passes in CI.
- UI matches the PDF screen: RTL, tokens, ≥ 44 px targets, Arabic error messages from BR §9.
- Lint and typecheck are clean (ruff + mypy for the backend; eslint + tsc for the frontend). There are no `any` types in frontend money code. Money code uses integer minor units only, never floats (BR-GEN-01).
- `docs/traceability.md` is updated (BR → code → test).
- The team-lead has reviewed the change.

## 7. Hard rules for every agent
- Never invent business behavior. If a rule is missing, add it to `docs/product/open-questions.md`, tag the product-analyst, and use the documented default.
- Never commit secrets. Secrets live only in `infra/deploy.env` (gitignored) and on the server in `/opt/simple-pos/.env`.
- Never run E2E/QA against `localhost`. QA results only count when produced on the server.
- Never run destructive commands on the live DB. Migrations use `python manage.py migrate` only (never `flush`, `reset_db`, or dropping tables), and a backup is taken first.
- Never modify the delivery app's files, nginx server blocks, containers, or database on the shared server.
- Keep commits small, and write them as Conventional Commits that cite BR IDs, e.g. `feat(orders): enforce BR-TBL-02 single open order per table`.
- Everything the user sees is in Arabic. Code, identifiers, and docs are in English.
