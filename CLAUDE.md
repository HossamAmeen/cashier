# Simple POS — Project Constitution

This file is read by every agent at the start of every session. Follow it exactly.

## 1. What we are building
We are building a simple Arabic RTL cashier / POS system for a small restaurant or café. It has:
- a web app installable as a **PWA**
- a REST backend
- a PostgreSQL database
- deployment to a real server under a real domain

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
| `backend-dev` | `apps/api`, DB schema/migrations, seeds, API tests | change the contract silently |
| `frontend-dev` | `apps/web` (React PWA), screens 01–20, RTL design system | compute authoritative money |
| `qa-engineer` | `e2e/`, API + UI test suites, QA reports, bug log | run tests against localhost |
| `devops-engineer` | `infra/`, server bootstrap, DNS/TLS, deploy, backups, the server-side QA runner | commit secrets |

## 4. Tech stack (decided — change only through an ADR by team-lead)
- **Monorepo**: pnpm workspaces. Layout:
  - `apps/api`
  - `apps/web`
  - `packages/shared` (types, money utils, error codes)
  - `e2e`
  - `infra`
  - `docs`
- **Backend**: Node 20 LTS, NestJS, Prisma, PostgreSQL 16, zod or class-validator, argon2, JWT access token (15 min) + httpOnly refresh cookie, pino logs.
- **Frontend**: React 18 + TypeScript + Vite, React Router, TanStack Query, Tailwind CSS (design tokens from the PDF), `vite-plugin-pwa`, API client generated from openapi.yaml, self-hosted **IBM Plex Sans Arabic**.
- **Tests**:
  - Vitest/Jest unit tests (api + web)
  - Supertest API integration tests against a real Postgres
  - **Playwright** E2E + API suites in `e2e/`
- **Infra**:
  - Ubuntu 24.04 VPS, Docker + Docker Compose
  - **Caddy** (automatic HTTPS)
  - two environments on one server, `staging` and `production`, each with its own DB
  - QA runs **on the server** against staging

## 5. Workflow & gates
```
Phase 0  Inputs check (devops)      → infra/deploy.env present, SSH works, DNS points to SERVER_IP
Phase 1  Product (PA)               → stories + AC mapped to BR IDs, open questions      ⛔ GATE A: owner approves rules
Phase 2  Architecture (TL)          → ADRs, scaffold, openapi.yaml, task board            ⛔ GATE B: owner approves contract
Phase 3  Build (BE ∥ FE)            → vertical slices in the order of docs/tasks.md
Phase 4  Staging deploy (devops)    → https://staging.$DOMAIN healthy
Phase 5  QA on server (QA)          → report in docs/qa/reports/, bugs in docs/qa/bugs.md
Phase 6  Fix loop (BE/FE → QA)      → until 0 open P1/P2 and all AC-* pass
Phase 7  Production (devops)        ⛔ GATE C: owner approves → https://$DOMAIN
```
At each ⛔ gate, stop and ask the human owner. Do not continue until the owner explicitly says "approved".

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
- Lint and typecheck are clean. There are no `any` types in money code. Money code is integers only (BR-GEN-01).
- `docs/traceability.md` is updated (BR → code → test).
- The team-lead has reviewed the change.

## 7. Hard rules for every agent
- Never invent business behavior. If a rule is missing, add it to `docs/product/open-questions.md`, tag the product-analyst, and use the documented default.
- Never commit secrets. Secrets live only in `infra/deploy.env` (gitignored) and on the server in `/opt/simple-pos/<env>/.env`.
- Never run E2E/QA against `localhost`. QA results only count when produced on the server.
- Never run destructive commands on the production DB. Migrations use `prisma migrate deploy` only, and a backup is taken first.
- Keep commits small, and write them as Conventional Commits that cite BR IDs, e.g. `feat(orders): enforce BR-TBL-02 single open order per table`.
- Everything the user sees is in Arabic. Code, identifiers, and docs are in English.
