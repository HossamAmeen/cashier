# e2e — Playwright API + UI suites

- Runs **only on the server** through `infra/scripts/qa-remote.sh` (devops), against
  `BASE_URL=https://cashier.hossam-ameen.online` and `API_URL=https://api.cashier.hossam-ameen.online`, before GATE C
  (ADR-0004). `playwright.config.ts` refuses localhost targets. Local runs are limited to `pnpm --filter e2e typecheck`.
- Layout: `tests/api` (every BR and §9 code), `tests/ui` (AC-01…AC-15 flows), `tests/concurrency` (AC-04, AC-07),
  `tests/visual` (AC-15 at 1280×800 and 1024×768).
- Test titles start with their IDs (`AC-01 BR-PAY-02 …`). Selectors: roles/labels first, then `data-testid="s<screen>-…"`.
