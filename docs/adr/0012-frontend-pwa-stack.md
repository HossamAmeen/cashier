# ADR-0012 — Frontend PWA stack, generated API client, no offline mutations

- Status: Accepted (team-lead, 2026-09-29)
- Refs: CLAUDE.md §4 Frontend; BR §0 (offline order creation out of scope), BR-GEN-01/03/05/06, AC-15; PDF p.5, p.6, p.32

## Decision
1. **Stack**: React 18 + TypeScript (strict) + Vite, React Router 6, TanStack Query 5, Tailwind CSS 3 with the PDF
   design tokens (`frontend/tailwind.config.ts`, `frontend/src/styles/tokens.css`), `vite-plugin-pwa` (Workbox),
   Vitest + Testing Library, ESLint (typescript-eslint) + Prettier. Package manager: pnpm (workspace with `e2e/`).
2. **RTL/Arabic**: `index.html` has `<html lang="ar" dir="rtl">`; only logical CSS utilities (`ms-*`, `me-*`,
   `ps-*`, `start-*`); Western digits (`Intl.NumberFormat('en-US')` for numbers, Arabic month/day names with
   `ar-EG-u-nu-latn`). Touch targets `min-h-touch` (44 px) and `h-touch-lg` (58 px, primary POS actions).
3. **Font**: IBM Plex Sans Arabic self-hosted via `@fontsource/ibm-plex-sans-arabic` (woff2 bundled by Vite into
   `/assets`, precached by the service worker). No Google Fonts CDN.
4. **API client**: types generated from `docs/api/openapi.yaml` with `openapi-typescript` into
   `frontend/src/api/schema.d.ts` (`pnpm gen:api`, CI fails if the committed file is stale); requests through
   `openapi-fetch` with a middleware that adds `Authorization`, refreshes once on `UNAUTHENTICATED`, unwraps the
   envelope and throws `ApiError{code, status, details}`. Base URL = `VITE_API_BASE_URL` (build arg).
5. **Money/time helpers**: `src/lib/money.ts` (ADR-0005), `src/lib/datetime.ts` (ADR-0013), `src/lib/errors.ts`
   (BR §9 Arabic map, tested against the contract enum).
6. **PWA**: manifest `lang: ar`, `dir: rtl`, `display: standalone`, `theme_color #0d7a6b`, `background_color #f4f6f9`,
   icons 192/512 + maskable. Service worker precaches the app shell and fonts only. **API responses are not cached**
   and **no request is queued offline** (BR §0). When `navigator.onLine` is false the UI shows the offline banner and
   disables every mutating button (confirm order, pay, open/close shift, admin saves); a mutation that fails on network
   keeps the client state (e.g. the cart, US-11.20).
7. **Routing**: routes per the frontend-dev charter; role guards (BR-AUTH-04) and the open-shift guard (BR-SHIFT-03) are
   UX only — the server enforces everything (BR-ROLE-05).
8. **Serving**: multi-stage Dockerfile → `nginx:1.27-alpine` serving `dist/` on container port 80 with SPA fallback,
   `Cache-Control: no-cache` for `index.html`/`sw.js`, long cache for hashed assets; published as `127.0.0.1:8121`.

## Consequences
- The contract is the single source of API types; a contract change requires `pnpm gen:api` in the same PR.
- Offline behavior is read-only by design; this is visible to users via the offline banner text (GATE B question).
