# ADR-0003 — Separate front/API origins: CORS, refresh-cookie scope, CSRF

- Status: Accepted (team-lead, 2026-09-29)
- Refs: owner decision 2026-09-28 (FRONT_DOMAIN / BACKEND_DOMAIN), CLAUDE.md §1, §4; BR-AUTH-02; OQ-6; ADR-0011

## Context
The PWA is served from `https://cashier.hossam-ameen.online` (`FRONT_DOMAIN`) and the API from
`https://api.cashier.hossam-ameen.online` (`BACKEND_DOMAIN`). These are **different origins** but the **same site**
(registrable domain `hossam-ameen.online`). The same registrable domain also hosts unrelated apps:
`delivery.*`, `api.delivery.*`, `dental.*`, `api.dental.*` — on the same server.

## Decision
### CORS
- `django-cors-headers` with `CORS_ALLOWED_ORIGINS = [https://$FRONT_DOMAIN]` exactly (env `CORS_ALLOWED_ORIGINS`);
  no regexes, no wildcard, `CORS_ALLOW_CREDENTIALS = True` (needed for the refresh cookie).
- Allowed request headers: defaults + `Authorization`, `Idempotency-Key`, `X-Requested-With`.
- Exposed response headers: `Retry-After`, `Idempotent-Replayed`.
- `CORS_URLS_REGEX = r"^/api/.*$"`.

### Refresh cookie — scoped to the **API host only** (host-only cookie)
Cookie `pos_refresh`: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth/`; **no `Domain` attribute**, so the browser
sends it only to `api.cashier.hossam-ameen.online`.

Why not `Domain=.hossam-ameen.online`:
1. The cookie would be sent to every sibling host — the delivery and dental apps included. Any bug, log line or
   compromise there would expose POS refresh tokens. Least privilege wins.
2. Nothing on `cashier.hossam-ameen.online` needs to read it: the PWA obtains access tokens by calling
   `POST https://api.cashier…/api/auth/refresh` with `credentials: "include"`.
3. `SameSite=Strict` still works cross-origin: SameSite is evaluated per **site**, and front + API are same-site,
   so the browser attaches the cookie to the PWA's fetches but never to requests initiated from another site.

`Path=/api/auth/` keeps the cookie off every business request. Lifetime (OQ-6): "تذكرني" checked → `Max-Age` 7 days;
unchecked → a session cookie (no `Max-Age`, dropped when the browser closes). The server-side refresh-token lifetime is
7 days in both cases (ADR-0011).

### CSRF
- Business endpoints authenticate with `Authorization: Bearer <access>`; browsers never attach it automatically, so they
  are not CSRF-able. Django's CSRF middleware stays enabled for the admin only.
- The only cookie-authenticated endpoints are `POST /api/auth/refresh` and `POST /api/auth/logout`. They require:
  1. the header `X-Requested-With: simple-pos` — a non-safelisted header that forces a CORS pre-flight, which only
     `FRONT_DOMAIN` passes; and
  2. an `Origin` header equal to one of `CORS_ALLOWED_ORIGINS` when `Origin` is present.
  A missing header or a wrong origin → `401 UNAUTHENTICATED` (the request is treated as unauthenticated; no new
  error code is invented).
- Sibling subdomains are same-site, so `SameSite` alone does not stop them; the custom-header + origin check does.
- The access token lives **only in memory** in the PWA (never `localStorage`/`sessionStorage`), limiting XSS impact.

### Other headers
`SECURE_HSTS_SECONDS` is set by nginx (ADR-0002); Django sets `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS=DENY`,
`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `CSRF_TRUSTED_ORIGINS=[https://$BACKEND_DOMAIN]` (admin).

## Consequences
- Every PWA request is cross-origin: GETs with `Authorization` trigger a pre-flight; `CORS_PREFLIGHT_MAX_AGE=86400`
  keeps this cheap.
- Local development: the Vite dev server origin (`http://localhost:5173`) is added to `CORS_ALLOWED_ORIGINS` only in
  `development.py`; cookies there are not `Secure` (development only).
- QA must include checks that a foreign `Origin` is refused on refresh/logout and receives no CORS headers.
