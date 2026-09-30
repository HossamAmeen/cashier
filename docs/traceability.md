# Traceability matrix

Owner: team-lead (ADR-0008). One row per BR rule and acceptance scenario: rule → user stories → contract operations → planned tasks → implementing code → tests → last QA result (on the server).

Sources: stories from `docs/product/user-stories.md` (coverage matrix A/B), operations from the `x-br` of each operation in `docs/api/openapi.yaml` (regenerated after the P2-04 contract review), tasks from `docs/tasks.md`. Code/test columns are filled by backend-dev/frontend-dev when a task moves to `review`; the QA column is filled by qa-engineer from `docs/qa/reports/` only (never from local runs).

Legend: `TBD` = not implemented yet; `—` = not applicable.

## Business rules

| BR | Stories | Operations (contract) | Tasks | Code | Tests | Last QA |
|---|---|---|---|---|---|---|
| BR-GEN-01 | US-03, US-09, US-10, US-11, US-26 | all (`*_minor` integers) | P2-01, every BE/FE task | `backend/common/money.py`, `frontend/src/lib/money.ts` | `backend/tests/test_money.py`, `backend/tests/test_contract_rules.py`, `frontend/src/lib/money.test.ts` | — |
| BR-GEN-02 | US-02, US-04, US-07, US-12, US-15, US-20, US-26, US-27 | getAdminDashboard, listOrders | T09-BE-01, T09-QA-01, T10-BE-01, T10-QA-01 | `backend/common/timeutils.py`, `frontend/src/lib/datetime.ts` (scaffold) | `backend/tests/test_timeutils.py`, `frontend/src/lib/datetime.test.ts` (scaffold) | — |
| BR-GEN-03 | US-02, US-04, US-05, US-11, US-14, US-26 | closeShift, createOrder, getAdminDashboard, getCashierDashboard, getCurrentShift, getShift, payOrder, updateOrder | T08-BE-01 | TBD | TBD | — |
| BR-GEN-04 | US-09, US-18, US-21, US-26 | deleteCategory, deleteItem, updateTable | T03-BE-01, T04-BE-01 | TBD | TBD | — |
| BR-GEN-05 | US-25, US-27 | — (UI only; see notes) | T01-FE-01, T11-FE-01 | TBD | TBD | — |
| BR-GEN-06 | US-01, US-25 | all (`Error` envelope) | P2-01, every BE/FE task | `backend/common/{error_codes,exceptions,exception_handler}.py`, `frontend/src/lib/errors.ts` | `backend/tests/test_error_envelope.py`, `backend/tests/test_error_catalog.py`, `frontend/src/lib/errors.test.ts` | — |
| BR-ROLE-01 | US-06, US-08, US-09, US-12, US-15, US-16, US-18, US-20, US-21, US-23, US-29 | createCategory, createItem, createTable, createUser, deleteCategory, deleteItem, getAdminDashboard, getCashier, getCategory, getItem, getOrder, getUser, listCashiers, listCategories, listItems, listOrders, listShifts, listUsers, updateCategory, updateItem, updateTable, updateUser | T02-BE-01, T02-BE-02, T02-FE-01, T02-QA-01, T08-FE-02 | TBD | TBD | — |
| BR-ROLE-02 | US-03, US-05, US-06, US-11, US-12, US-13, US-21, US-23, US-29 | cancelOrder, createOrder, openShift, payOrder, updateOrder | T05-BE-01, T06-BE-01 | TBD | TBD | — |
| BR-ROLE-03 | US-05, US-12, US-23 | closeShift, openShift | T05-BE-01 | TBD | TBD | — |
| BR-ROLE-04 | US-04, US-12, US-15, US-23, US-29 | getOrder, getShift, listOrders, listShifts | T05-BE-01, T08-FE-02, T09-BE-01, T09-QA-01 | TBD | TBD | — |
| BR-ROLE-05 | US-03, US-04, US-08, US-15, US-18, US-20, US-23, US-28 | getAdminDashboard, listUsers, updateUser | T02-QA-01 | TBD | TBD | — |
| BR-ROLE-06 | US-06, US-07, US-12, US-13, US-23 | cancelOrder, getOrder, getOrderReceipt, payOrder, updateOrder | T06-BE-01, T06-FE-02 | TBD | TBD | — |
| BR-AUTH-01 | US-01 | login | T01-BE-01, T01-FE-02, T01-QA-01 | TBD | TBD | — |
| BR-AUTH-02 | US-01, US-16, US-18 | login, refreshSession, updateUser | T01-BE-01, T01-FE-02, T01-QA-01, T02-BE-01 | TBD | TBD | — |
| BR-AUTH-03 | US-01 | login | T01-BE-01, T01-FE-02, T01-QA-01 | TBD | TBD | — |
| BR-AUTH-04 | US-01, US-02 | getCashierDashboard, getMe, login | T01-BE-01, T01-FE-02, T01-QA-01 | TBD | TBD | — |
| BR-USR-01 | US-19 | createUser, updateUser | T01-BE-01, T02-BE-01, T02-FE-01, T02-QA-01 | TBD | TBD | — |
| BR-USR-02 | US-16, US-18 | updateUser | T02-BE-01, T02-FE-01, T02-QA-01 | TBD | TBD | — |
| BR-USR-03 | US-16, US-17, US-19 | updateUser | T02-BE-01, T02-FE-01, T02-QA-01, T05-BE-01, T05-QA-01 | TBD | TBD | — |
| BR-USR-04 | US-18, US-19 | updateUser | T02-BE-01, T02-FE-01, T02-QA-01 | TBD | TBD | — |
| BR-USR-05 | US-19 | updateUser | T02-BE-01, T02-FE-01, T02-QA-01, T05-BE-01, T05-QA-01 | TBD | TBD | — |
| BR-SHIFT-01 | US-02, US-03, US-24 | openShift | T05-BE-01, T05-FE-01, T05-QA-01 | TBD | TBD | — |
| BR-SHIFT-02 | US-03 | openShift | T05-BE-01, T05-FE-01, T05-QA-01 | TBD | TBD | — |
| BR-SHIFT-03 | US-02, US-03, US-04, US-06, US-11, US-13, US-24 | cancelOrder, createOrder, getCurrentShift, payOrder, updateOrder | T05-BE-01, T05-FE-01, T05-QA-01, T06-BE-01 | TBD | TBD | — |
| BR-SHIFT-04 | US-05, US-22, US-24 | closeShift, getCurrentShift | T08-BE-01, T08-FE-01, T08-QA-01 | TBD | TBD | — |
| BR-SHIFT-05 | US-02, US-04, US-05, US-12, US-17, US-20, US-22 | cancelOrder, closeShift, getAdminDashboard, getCashier, getCashierDashboard, getCurrentShift, getShift, listShifts | T05-BE-01, T08-BE-01, T08-FE-01, T08-QA-01, T10-BE-01, T10-QA-01 | TBD | TBD | — |
| BR-SHIFT-06 | US-05, US-22 | closeShift, getCurrentShift, getShift | T08-BE-01, T08-FE-01, T08-QA-01 | TBD | TBD | — |
| BR-SHIFT-07 | US-05, US-17, US-22 | closeShift, getShift | T08-BE-01, T08-FE-01, T08-QA-01 | TBD | TBD | — |
| BR-SHIFT-08 | US-05, US-17, US-22, US-27 | closeShift, getShift, listShifts | T08-BE-01, T08-FE-01, T08-FE-02, T08-QA-01 | TBD | TBD | — |
| BR-SHIFT-09 | US-05, US-22 | closeShift, logout | T08-BE-01, T08-FE-01, T08-QA-01 | TBD | TBD | — |
| BR-SHIFT-10 | US-02, US-03, US-05, US-25 | — (UI only; see notes) | T05-FE-01, T08-FE-01 | TBD | TBD | — |
| BR-TBL-01 | US-02, US-06, US-11, US-20, US-22 | getAdminDashboard, getCashierDashboard, getTable, listTables | T04-BE-01, T04-FE-01, T06-BE-01, T10-BE-01 | TBD | TBD | — |
| BR-TBL-02 | US-07, US-11, US-24 | createOrder | T04-FE-01, T06-BE-01 | TBD | TBD | — |
| BR-TBL-03 | US-06, US-07, US-11, US-21 | createOrder | T04-FE-01, T06-BE-01 | TBD | TBD | — |
| BR-TBL-04 | US-02, US-06, US-07, US-11, US-22 | getCashierDashboard, getTable, listTables | T04-BE-01, T04-FE-01, T06-BE-01, T10-BE-01 | TBD | TBD | — |
| BR-TBL-05 | US-06, US-07, US-12, US-13, US-14, US-22 | cancelOrder, payOrder | T04-FE-01, T06-BE-01, T07-BE-01 | TBD | TBD | — |
| BR-TBL-06 | US-06, US-11, US-21 | createTable, getTable, listTables, updateTable | T04-BE-01, T04-FE-01, T04-QA-01, T06-BE-01 | TBD | TBD | — |
| BR-ITEM-01 | US-08, US-09, US-10, US-11 | createOrder, getCatalog, updateItem, updateOrder | T03-BE-01, T03-FE-02, T03-QA-01, T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ITEM-02 | US-10 | createItem, updateItem | T03-BE-01, T03-FE-02, T03-QA-01 | TBD | TBD | — |
| BR-ITEM-03 | US-07, US-09, US-10, US-11, US-12, US-17 | createOrder, getOrder, updateItem, updateOrder | T03-BE-01, T03-FE-02, T03-QA-01, T06-BE-01 | TBD | TBD | — |
| BR-ITEM-04 | US-09 | deleteItem | T03-BE-01, T03-FE-02, T03-QA-01, T06-BE-01 | TBD | TBD | — |
| BR-ITEM-05 | US-08 | deleteCategory, updateCategory | T03-BE-01, T03-FE-01, T03-QA-01 | TBD | TBD | — |
| BR-ITEM-06 | US-08, US-11 | getCatalog, listCategories | T03-BE-01, T03-FE-01, T03-QA-01, T06-FE-01 | TBD | TBD | — |
| BR-ITEM-07 | US-08 | createCategory, getCatalog, updateCategory | T03-BE-01, T03-FE-01, T03-QA-01, T06-FE-01 | TBD | TBD | — |
| BR-SET-01 | US-14, US-28 | getOrderReceipt, getSettings, updateSettings | T02-BE-03, T02-FE-03, T02-QA-01, T07-BE-01 | TBD | TBD | — |
| BR-SET-02 | US-28 | getSettings, updateSettings | T02-BE-03, T02-FE-03, T02-QA-01 | TBD | TBD | — |
| BR-SET-03 | US-14, US-28 | getSettings, updateSettings | T02-BE-03, T02-FE-03, T02-QA-01 | TBD | TBD | — |
| BR-ORD-01 | US-11 | createOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-02 | US-11 | createOrder, updateOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-03 | US-11 | createOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-04 | US-06, US-11, US-14 | createOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-05 | US-11, US-22 | createOrder, updateOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-06 | US-11, US-12, US-13, US-22 | createOrder, getOrder, updateOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-07 | US-11, US-22 | createOrder, updateOrder | T06-BE-01, T06-FE-01 | TBD | TBD | — |
| BR-ORD-08 | US-07, US-11, US-12, US-13, US-24 | cancelOrder, payOrder, updateOrder | T06-BE-01, T06-FE-01, T06-FE-02, T07-BE-01 | TBD | TBD | — |
| BR-ORD-09 | US-12, US-15 | cancelOrder | T06-BE-01, T06-FE-02 | TBD | TBD | — |
| BR-ORD-10 | US-02, US-04, US-11, US-15, US-22 | createOrder, listOrders | T06-BE-01, T09-BE-01 | TBD | TBD | — |
| BR-PAY-01 | US-13 | payOrder | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-02 | US-13, US-22 | payOrder | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-03 | US-13 | payOrder | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-04 | US-13, US-14, US-24 | payOrder | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-05 | US-13, US-14, US-22 | payOrder | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-06 | US-14 | getOrderReceipt | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |
| BR-PAY-07 | US-14, US-28 | getOrderReceipt | T07-BE-01, T07-FE-01, T07-QA-01 | TBD | TBD | — |

## Acceptance scenarios

| AC | Stories | Operations (contract) | Tasks | Tests (e2e) | Last QA |
|---|---|---|---|---|---|
| AC-01 | US-03, US-06, US-07, US-11, US-13, US-22 | createOrder, payOrder | T06-BE-01, T07-BE-01, T07-QA-01, T11-QA-01 | TBD | — |
| AC-02 | US-05, US-22 | closeShift | T08-BE-01, T08-QA-01, T11-QA-01 | TBD | — |
| AC-03 | US-03, US-05, US-11, US-24 | closeShift, createOrder, openShift | T05-BE-01, T05-QA-01, T06-BE-01, T08-BE-01, T08-QA-01, T11-QA-01 | TBD | — |
| AC-04 | US-11, US-24 | createOrder | T06-BE-01, T11-QA-01 | TBD | — |
| AC-05 | US-12 | cancelOrder, updateOrder | T06-BE-01, T07-BE-01, T07-QA-01, T11-QA-01 | TBD | — |
| AC-06 | US-02, US-05, US-06, US-12, US-15 | cancelOrder, closeShift, getCurrentShift, listOrders, listTables | T06-BE-01, T08-QA-01, T09-QA-01, T10-QA-01, T11-QA-01 | TBD | — |
| AC-07 | US-13, US-24 | payOrder | T07-BE-01, T07-QA-01, T11-QA-01 | TBD | — |
| AC-08 | US-13 | payOrder | T07-BE-01, T07-QA-01, T11-QA-01 | TBD | — |
| AC-09 | US-10, US-11 | createOrder, getOrder, updateItem, updateOrder | T06-BE-01, T11-QA-01 | TBD | — |
| AC-10 | US-08, US-09, US-11 | createOrder, deleteCategory, deleteItem, updateCategory, updateItem | T03-BE-01, T03-QA-01, T06-BE-01, T11-QA-01 | TBD | — |
| AC-11 | US-03, US-07, US-11, US-12, US-13, US-16, US-18, US-23 | cancelOrder, createOrder, listUsers, openShift, payOrder, updateOrder, updateUser | T02-BE-01, T02-QA-01, T05-BE-01, T05-QA-01, T06-BE-01, T10-QA-01, T11-QA-01 | TBD | — |
| AC-12 | US-01, US-16, US-18, US-19 | login, updateUser | T01-BE-01, T01-QA-01, T02-BE-01, T02-QA-01, T05-QA-01, T11-QA-01 | TBD | — |
| AC-13 | US-01 | login | T01-BE-01, T01-QA-01, T11-QA-01 | TBD | — |
| AC-14 | US-06, US-22 | — (UI only) | T06-FE-01, T11-QA-01 | TBD | — |
| AC-15 | US-25 | — (UI only) | T01-FE-01, T11-FE-01, T11-QA-01 | TBD | — |

## Notes

- UI-only rules (no API operation): BR-GEN-05: Arabic RTL UI, Western digits (`frontend/index.html`, `frontend/src/lib/datetime.ts`); AC-15 visual suite.; BR-SHIFT-10: UI confirm dialogs (screens 03, 05); the server does not depend on them.
- BR-GEN-03 (server computes every total) is carried by every computing operation listed in its row (contract review #14).
- AC-14 and AC-15 are UI-only; AC-14's ≤ 5-tap path uses listTables → getCatalog → createOrder.
- Scaffold (P2-01) code covering cross-cutting rules: `backend/common/{error_codes,exception_handler,responses,money,timeutils,net,permissions}.py`; `frontend/src/lib/{money,errors,datetime}.ts`, `frontend/src/api/client.ts`.
