# Simple POS — Task board

Owner: team-lead. Status values: `todo | doing | review | done`. A task moves to `done` only after the team-lead's DoD
review (CLAUDE.md §6). Slices follow CLAUDE.md §5; inside a slice BE and FE run in parallel against the contract, then
devops deploys and QA runs that slice's suites **on the server** (ADR-0004).

**Task ID** = `T<slice>-<role>-<n>`; roles: TL team-lead, PA product-analyst, BE backend-dev, FE frontend-dev,
QA qa-engineer, DO devops-engineer. Endpoints are `operationId`s in `docs/api/openapi.yaml`.

**Every BE task** includes: models + migrations (constraints per ADR-0006), services/selectors, serializers, views with
`@extend_schema(operation_id=…)` matching the contract, pytest tests named with BR IDs, `make ci` green (ruff, mypy,
check, migrations, pytest on Postgres, contract diff), and its rows in `docs/traceability.md`.
**Every FE task** includes: the PDF screen at 1280×800 and 1024×768, RTL, tokens, ≥ 44 px targets, Arabic §9 messages via
`src/lib/errors.ts`, money via `src/lib/money.ts`, `data-testid="s<screen>-…"`, vitest tests for logic, lint/typecheck
clean, screenshot compared with the PDF page.
**Every QA task** writes Playwright specs titled with AC/BR IDs and runs them on the server via `infra/scripts/qa-remote.sh`.

## Phase 2 — Architecture

| ID | Owner | Task | BR / AC | Screens | Output | Depends | Status |
|---|---|---|---|---|---|---|---|
| P2-01 | TL | ADRs, agent files, scaffold, contract, task board, traceability | all (planning) | — | `docs/adr/*`, `.claude/agents/*`, `backend/`, `frontend/`, `e2e/`, `.github/workflows/ci.yml`, `docker-compose.yml`, `docs/api/openapi.yaml`, `docs/tasks.md`, `docs/traceability.md` | Gate A | done |
| P2-02 | PA | Business review of `openapi.yaml`: `*_minor` money, every §9 code, roles per op, Gate B defaults (FORBIDDEN_ROLE vs NOT_FOUND, text limits, offline/5xx text, icon set) | BR §9, BR-ROLE-*, BR-GEN-01 | — | `docs/api/contract-review.md` (APPROVE WITH FIXES) | P2-01 | done |
| P2-03 | DO | Additive server bootstrap (swap, Docker, nginx blocks, certbot `simple-pos`) — in parallel, not blocked by Gate B | — | — | `infra/scripts/bootstrap.sh`, `infra/RUNBOOK.md` | Phase 0 | doing |
| P2-04 | TL | Apply contract review: body-id `NOT_FOUND`, CASHIER `getOrder` restricted to own or OPEN DINE_IN, `INTERNAL_ERROR` kept (D3), per-operation check order, `amount_received_minor ≥ 0`, idempotency/`shift_id`/updateOrder rules, D1–D6 recorded, traceability fixes | review #1–#14, D1–D6 | — | `docs/api/openapi.yaml`, ADR-0009/0010, `docs/tasks.md`, `docs/traceability.md`, error-catalogue tests | P2-02 | done |
| ⛔ | owner | **GATE B** — approve contract + task plan | | | | P2-02 | done (2026-09-29) |

## Slice 1 — auth

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T01-BE-01 | BE | `apps/users`: custom `User` (role, status, username CI-unique + regex CHECK, `token_version`, `last_login_at`), set `AUTH_USER_MODEL` **before any migration is applied**, `LoginFailure`; `PosJWTAuthentication` (tv + ACTIVE check); login / refresh / logout / me with the refresh cookie + CSRF header/origin guard; BR-AUTH-03 counter; `token_blacklist` app | BR-AUTH-01..04, BR-USR-01, OQ-4, OQ-6, OQ-29, OQ-30; AC-12 (login part), AC-13 | 01 | login, refreshSession, logout, getMe | `backend/apps/users/{models,managers,authentication,services,selectors,serializers,views,urls_auth,admin}.py`, `migrations/0001_*`, `tests/` | Gate B | done |
| T01-BE-02 | BE | Management commands `seed_dev` (PDF sample catalogue, 12 tables, admin + 2 cashiers), `seed_qa` (deterministic AC fixtures; **refuses unless `PRELAUNCH=true`**) and `seed_initial` (go-live: first admin from env, settings, tables; idempotent), extended in later slices | ADR-0004 | — | — | `backend/apps/users/management/commands/seed_*.py` (+ per-app fixtures later) | T01-BE-01 | done |
| T01-FE-01 | FE | Design-system base components (Button 44/58, Badge set, Card, KPI, Modal-confirm, FormField, Toggle, DataTable, NumericKeypad, QtyStepper) + AppShell (right sidebar, icon rail < 1024 px, TopBar) per PDF p.5–6 | BR-GEN-05, AC-15 | shell 02–20 | — | `frontend/src/components/**`, `frontend/src/layouts/AppShell.tsx` | Gate B | done |
| T01-FE-02 | FE | Auth: session bootstrap (refresh on load), login screen, role redirect, route guards, logout, 401 → screen 01 with the §9 message, "نسيت كلمة المرور؟" static hint, remember-me | BR-AUTH-01..04, OQ-5, OQ-6; US-01, US-23.7, US-27 | 01 | login, refreshSession, logout, getMe | `frontend/src/auth/**`, `frontend/src/pages/Login.tsx` | T01-FE-01 | done |
| T01-DO-01 | DO | `infra/scripts/deploy.sh` (build SHA-tagged images, backup, `migrate`, up, health wait, rollback) and `infra/scripts/qa-remote.sh` (seed_qa + Playwright container on the server); first deploy of slice 1 | ADR-0002, ADR-0004 | — | getHealth | `infra/scripts/{deploy,qa-remote}.sh` | P2-03, T01-BE-01 | todo |
| T01-QA-01 | QA | API: BR-AUTH-01 (identical 401 bodies), BR-AUTH-02 (disabled, revocation), BR-AUTH-03 (6th attempt, correct password during lockout, reset on success), UNAUTHENTICATED, refresh/logout CSRF guard, cookie attributes; UI: login + role redirect | BR-AUTH-01..04; AC-12, AC-13 | 01 | auth/* | `e2e/tests/api/auth.spec.ts`, `e2e/tests/ui/login.spec.ts` | T01-DO-01 | todo |

## Slice 2 — users (users, cashiers projection, settings, account)

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T02-BE-01 | BE | Users list/create/get/update: lower-casing, DUPLICATE_VALUE, password rules, revocation on disable/password/role change (role change documented in updateUser, review #10), LAST_ADMIN with row locks; USER_HAS_OPEN_SHIFT via `shifts.selectors.has_open_shift` (stub returns False until T05-BE-01 wires it) | BR-USR-01..05, BR-AUTH-02, BR-ROLE-01, OQ-31, OQ-37; AC-11, AC-12 | 18, 19 | listUsers, createUser, getUser, updateUser | `backend/apps/users/…` | T01-BE-01 | done |
| T02-BE-02 | BE | Cashiers projection (list with current shift + counts, detail) | BR §2 User, BR-ROLE-01, OQ-35 | 16, 17 | listCashiers, getCashier | `backend/apps/users/{selectors,views_cashiers}.py` | T02-BE-01 | done |
| T02-BE-03 | BE | `apps/store_settings`: singleton (CHECK id=1, data migration with footer "شكرًا لزيارتكم"), get/patch | BR-SET-01..03, OQ-7 | الإعدادات | getSettings, updateSettings | `backend/apps/store_settings/**` | T01-BE-01 | done |
| T02-FE-01 | FE | Users list + add/edit user (role cards, status toggle, empty password = unchanged, disabled reasons) | BR-USR-01..05, BR-ROLE-01; US-18, US-19 | 18, 19 | listUsers, createUser, getUser, updateUser | `frontend/src/pages/admin/Users*.tsx` | T01-FE-02 | done |
| T02-FE-02 | FE | Cashiers list + cashier details (profile part; shift history table in T08-FE-02) | US-16, US-17 | 16, 17 | listCashiers, getCashier | `frontend/src/pages/admin/Cashier*.tsx` | T02-FE-01 | done |
| T02-FE-03 | FE | Settings screen (form layout of 10/19) and cashier "الحساب" read-only profile | BR-SET-01..03, OQ-7, OQ-13; US-28, US-27.4 | الإعدادات, الحساب | getSettings, updateSettings, getMe | `frontend/src/pages/admin/Settings.tsx`, `frontend/src/pages/Account.tsx` | T01-FE-02 | done |
| T02-QA-01 | QA | RBAC (cashier → /users FORBIDDEN_ROLE), LAST_ADMIN, DUPLICATE_VALUE, username regex, password never returned, disable revokes sessions, settings rules | BR-USR-01..05, BR-SET-01..03, BR-ROLE-01/05; AC-11, AC-12 | 16–19 | users/*, cashiers/*, settings | `e2e/tests/api/users.spec.ts`, `settings.spec.ts`, `e2e/tests/ui/users.spec.ts` | T02-BE-*, T02-FE-* | todo |

## Slice 3 — categories / items

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T03-BE-01 | BE | `apps/catalog`: Category (icon enum), Item (price CHECK > 0, unique name per category), CRUD, delete rules (CATEGORY_NOT_EMPTY now; ITEM_IN_USE wired in T06-BE-01), unknown body `category_id` → NOT_FOUND, D2 name limits, `/api/catalog` | BR-ITEM-01..07, BR-GEN-04, BR §2; AC-10 (part) | 08, 09, 10, 11 (catalogue) | listCategories, createCategory, getCategory, updateCategory, deleteCategory, listItems, createItem, getItem, updateItem, deleteItem, getCatalog | `backend/apps/catalog/**` | T01-BE-01 | done |
| T03-FE-01 | FE | Categories screen with dialogs + icon picker (fixed set) | BR-ITEM-05..07; US-08 | 08 | categories/* | `frontend/src/pages/admin/Categories.tsx`, `frontend/src/components/CategoryIcon.tsx` | T01-FE-01 | done |
| T03-FE-02 | FE | Items list (search, chips, toggle, delete) + add/edit item with live preview, `parseToMinor` | BR-ITEM-01..04, BR-GEN-01; US-09, US-10 | 09, 10 | items/* | `frontend/src/pages/admin/Items*.tsx` | T03-FE-01 | done |
| T03-QA-01 | QA | Catalogue API rules + CATEGORY_NOT_EMPTY + disabled hidden from /catalog + admin UI flows | BR-ITEM-01..07; AC-10 (part) | 08–10 | catalog/* | `e2e/tests/api/catalog.spec.ts`, `e2e/tests/ui/catalog.spec.ts` | T03-BE-01, T03-FE-* | todo |

## Slice 4 — tables

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T04-BE-01 | BE | `apps/tables`: Table (unique number, CHECK > 0, is_active), list with derived status/current order (selector; occupancy becomes real in T06), create/get/update, TABLE_OCCUPIED on renumber/deactivate (wired in T06), cashier sees active only | BR-TBL-01, BR-TBL-04, BR-TBL-06, BR-GEN-04, OQ-14, OQ-32 | 06, 07 | listTables, createTable, getTable, updateTable | `backend/apps/tables/**` | T01-BE-01 | done |
| T04-FE-01 | FE | Tables grid (chips with counts, colour + text + icon, admin add/edit dialog, "طلب سفري") and table details layout | BR-TBL-01..06; US-06, US-07, US-21 | 06, 07 | tables/* | `frontend/src/pages/Tables*.tsx` | T01-FE-01 | done |
| T04-QA-01 | QA | Table admin rules, DUPLICATE_VALUE, inactive hidden for cashier | BR-TBL-06; US-21 | 06 | tables/* | `e2e/tests/api/tables.spec.ts` | T04-* | todo |

## Slice 5 — shifts (open)

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T05-BE-01 | BE | `apps/shifts`: Shift model (partial unique index `uniq_open_shift_per_cashier`, CHECKs), open (server `opened_at`), current, get (FORBIDDEN_ROLE for another cashier's shift), list (scoping); live totals selector; wire `has_open_shift` → BR-USR-03/05 tests | BR-SHIFT-01..03, BR-SHIFT-05 (live), BR-ROLE-02..04, BR-USR-03, BR-USR-05; AC-03 (part), AC-11 | 03, 04 | openShift, getCurrentShift, getShift, listShifts | `backend/apps/shifts/**` | T02-BE-01 | done |
| T05-FE-01 | FE | Open shift (quick amounts 0/200/500/1000, confirm dialog), current shift screen, header shift pill, no-shift redirects | BR-SHIFT-01..03, BR-SHIFT-10; US-03, US-04, US-27.1 | 03, 04 | openShift, getCurrentShift | `frontend/src/pages/shift/*` | T01-FE-02 | done |
| T05-QA-01 | QA | SHIFT_ALREADY_OPEN incl. parallel opens, admin FORBIDDEN_ROLE, NO_OPEN_SHIFT guard (with T06), BR-USR-03/05 | BR-SHIFT-01..03, BR-USR-03/05; AC-03, AC-11, AC-12 | 03, 04 | shifts/* | `e2e/tests/api/shifts-open.spec.ts`, `e2e/tests/concurrency/shift-open.spec.ts` | T05-* | todo |

## Slice 6 — orders

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T06-BE-01 | BE | `apps/orders`: Order + OrderLine (sequence from 1001, partial unique `uniq_open_order_per_table`, CHECKs), create (shift row lock, merge, snapshots, ITEM_INACTIVE, TABLE_*, unknown table/item id → NOT_FOUND, contract check order), update (line semantics OQ-21/23, OQ-20; foreign line id / changed item_id / `type`/`table_id` in body → VALIDATION_ERROR), cancel (reason 3–200), get (CASHIER: own, or another's only while OPEN DINE_IN, else FORBIDDEN_ROLE); wire ITEM_IN_USE (T03) and TABLE_OCCUPIED/occupancy (T04) | BR-ORD-01..10, BR-TBL-01..06, BR-ITEM-01, BR-ITEM-03, BR-ITEM-04, BR-SHIFT-03, BR-ROLE-02, BR-ROLE-06, OQ-18..23; AC-01 (confirm), AC-03, AC-04, AC-05 (edit/cancel), AC-06, AC-09, AC-10, AC-11 | 06, 07, 11, 12 | createOrder, getOrder, updateOrder, cancelOrder | `backend/apps/orders/**` | T03-BE-01, T04-BE-01, T05-BE-01 | done |
| T06-FE-01 | FE | Create/edit order (full-screen, mini rail, catalogue grid, cart panel, notes, discount amount/% → amount, preview, confirm, keep cart on error/offline); ≤ 5 taps | BR-ORD-01..08, BR-ITEM-01, BR-ITEM-06/07; US-11; AC-14 | 11 | getCatalog, createOrder, updateOrder | `frontend/src/pages/orders/OrderEditor*.tsx` | T03-FE-01, T04-FE-01, T05-FE-01 | done |
| T06-FE-02 | FE | Order details (OPEN/PAID/CANCELLED views, read-only for others/admin, cancel dialog with required reason ≥ 3) + table details order section | BR-ORD-08, BR-ORD-09, BR-ROLE-06; US-07, US-12; G-12, G-19, G-20 | 07, 12 | getOrder, cancelOrder | `frontend/src/pages/orders/OrderDetails.tsx` | T06-FE-01 | done |
| T06-QA-01 | QA | AC-01 up to confirm (315 → 300, table 5 OCCUPIED showing 5 items / 300.00), AC-04 parallel confirm, AC-05/06 (cancel), AC-09 snapshots, AC-10 ITEM_INACTIVE/ITEM_IN_USE, AC-11 NOT_ORDER_OWNER, AC-14 tap count | as listed | 06, 07, 11, 12 | orders/* | `e2e/tests/api/orders.spec.ts`, `e2e/tests/concurrency/table-confirm.spec.ts`, `e2e/tests/ui/order-flow.spec.ts` | T06-* | todo |

## Slice 7 — payments

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T07-BE-01 | BE | `apps/payments`: Payment (one-to-one order, CHECKs), IdempotencyKey table, pay transaction (order row lock → idempotency lookup → owner → shift → state; key scoped per user, hash includes order id; `amount_received_minor ≥ 0`), receipt endpoint (ownership before PAID check) | BR-PAY-01..07, BR-TBL-05, BR-ORD-08, BR-SET-01; AC-01, AC-05, AC-07, AC-08 | 13, 14 | payOrder, getOrderReceipt | `backend/apps/payments/**` | T06-BE-01, T02-BE-03 | done |
| T07-FE-01 | FE | Payment screen (CASH keypad + quick amounts "مضبوط"/next 50/100/500, CARD hides received, UUID Idempotency-Key per attempt, in-flight lock), success screen, 80 mm receipt print ("إيصال", no tax) | BR-PAY-01..07; US-13, US-14; OQ-8, OQ-9, OQ-10 | 13, 14 | payOrder, getOrderReceipt, getOrder | `frontend/src/pages/orders/Pay*.tsx`, `frontend/src/print/receipt.css` | T06-FE-02 | done |
| T07-QA-01 | QA | AC-01 full (change 50.00, table AVAILABLE), AC-07 (same key → one payment; different key → ORDER_NOT_EDITABLE; different body → IDEMPOTENCY_CONFLICT; parallel), AC-08, pay vs cancel race, receipt content | BR-PAY-*; AC-01, AC-05, AC-07, AC-08 | 13, 14 | payOrder, getOrderReceipt | `e2e/tests/api/payments.spec.ts`, `e2e/tests/concurrency/double-pay.spec.ts`, `e2e/tests/ui/payment.spec.ts` | T07-* | todo |

## Slice 8 — shifts (close / summary)

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T08-BE-01 | BE | Close shift (shift row lock, SHIFT_HAS_OPEN_ORDERS with numbers, snapshot, immutability guard); list/get use snapshots for CLOSED | BR-SHIFT-04..09, BR-GEN-03, OQ-3, OQ-36, OQ-39; AC-02, AC-03 | 05, 17, admin الورديات | closeShift, getShift, listShifts | `backend/apps/shifts/services.py` (+tests) | T07-BE-01 | done |
| T08-FE-01 | FE | Close shift (formula caption, difference preview عجز/زيادة/مطابق, disabled with open order numbers, confirm, summary, logout) | BR-SHIFT-04..10; US-05 | 05 | getCurrentShift, closeShift, logout | `frontend/src/pages/shift/CloseShift.tsx` | T05-FE-01 | done |
| T08-FE-02 | FE | Shift history table (screen 17 section + admin الورديات list with cashier filter) and read-only closed-shift summary (05 layout) | BR-SHIFT-08, BR-ROLE-01/04; US-17, US-29; OQ-12, OQ-35 | 05 (read-only), 17, admin الورديات | listShifts, getShift | `frontend/src/pages/admin/Shifts*.tsx` | T08-FE-01, T02-FE-02 | done |
| T08-QA-01 | QA | AC-02 exact math (expected 3,620.00, difference −20.00), immutability, AC-03 close with OPEN order, AC-06 cancelled excluded, close vs create race | BR-SHIFT-04..09; AC-02, AC-03, AC-06 | 05, 17 | shifts/* | `e2e/tests/api/shifts-close.spec.ts`, `e2e/tests/ui/shift-close.spec.ts` | T08-* | todo |

## Slice 9 — history

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T09-BE-01 | BE | Orders list: scoping (own for CASHIER, FORBIDDEN_ROLE on foreign cashier_id or another cashier's shift_id), Cairo date filters on created_at, method/status/shift filters, number search, `today_counts` | BR-ROLE-04, BR-GEN-02, BR-ORD-10, OQ-11, OQ-15, OQ-16 | 15, 04 | listOrders | `backend/apps/orders/{selectors,filters}.py` | T07-BE-01 | done |
| T09-FE-01 | FE | Orders history (اليوم/أمس/هذا الأسبوع Saturday start, date, cashier (admin), method, search, footer counts, pagination) | US-15 | 15 | listOrders | `frontend/src/pages/orders/History.tsx` | T06-FE-02 | done |
| T09-QA-01 | QA | Scoping, filters incl. 23:30 Cairo boundary, cancelled stays listed | BR-ROLE-04, BR-GEN-02; AC-06 | 15 | listOrders | `e2e/tests/api/history.spec.ts`, `e2e/tests/ui/history.spec.ts` | T09-* | todo |

## Slice 10 — dashboards

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T10-BE-01 | BE | `apps/dashboard`: cashier dashboard (shift KPIs, occupancy over all active tables, own running orders) and admin dashboard (today by paid_at/created_at in Cairo, open shifts, tables, cashiers, latest 3) | BR-SHIFT-05, BR-TBL-01/04, BR-GEN-02, OQ-15, G-16, G-41 | 02, 20 | getCashierDashboard, getAdminDashboard | `backend/apps/dashboard/**` | T09-BE-01 | done |
| T10-FE-01 | FE | Cashier dashboard (shift banner, 4 KPIs, 4 actions, running orders, "طلب سفري") and admin dashboard (6 KPIs, open shifts, latest orders, header open-shift badge) | US-02, US-20, US-27.2 | 02, 20 | dashboard/* | `frontend/src/pages/{CashierHome,AdminHome}.tsx` | T10-BE-01 contract only | done |
| T10-QA-01 | QA | KPI definitions (PAID-only counts, cancelled excluded, Cairo day), RBAC | BR-SHIFT-05, BR-GEN-02; AC-06, AC-11 | 02, 20 | dashboard/* | `e2e/tests/api/dashboard.spec.ts` | T10-* | todo |

## Slice 11 — PWA polish and release readiness

| ID | Owner | Task | BR / AC | Screens | Endpoints | Output | Depends | Status |
|---|---|---|---|---|---|---|---|---|
| T11-FE-01 | FE | Final icons/manifest, install prompt on dashboard, SW update prompt, offline banner + all mutations disabled offline, visual pass of 01–20 vs PDF | BR §0, BR-GEN-05; AC-15; ADR-0012 | 01–20 | — | `frontend/src/pwa/**` | all FE | done |
| T11-TL-01 | TL | Switch CI contract diff to `--strict`, complete traceability, final DoD review | ADR-0008 | — | all | `.github/workflows/ci.yml`, `docs/traceability.md` | all BE | done |
| T11-QA-01 | QA | AC-15 visual suite (20 screens × 2 viewports: dir=rtl, no horizontal scroll, ≥ 44 px), full regression AC-01…AC-15, GO/NO-GO report | all; AC-01..AC-15 | 01–20 | all | `e2e/tests/visual/*.spec.ts`, `docs/qa/reports/2026-10-01-release/SUMMARY.md` | T11-FE-01 | done |
| T11-DO-01 | DO | Backups (nightly `pg_dump`, 7 daily / 4 weekly), restore test, runbook | ADR-0004 | — | — | `infra/scripts/backup.sh`, `infra/RUNBOOK.md` | T01-DO-01 | done |
| ✅ | owner | **GATE C** — approve GO report + changelog | | | | T11-QA-01 | done |
| T12-DO-01 | DO | Go-live: backup, wipe QA data, `PRELAUNCH=false`, `seed_initial`, verify both hosts + delivery + dental apps | ADR-0004 | — | getHealth | `infra/RUNBOOK.md` log | GATE C | done |
