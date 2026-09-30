# ADR-0009 — Login rate limiting (BR-AUTH-03) and global DRF throttling

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-AUTH-01, BR-AUTH-03, OQ-30, AC-13; DRF_SKILL.md §61–83; ADR-0002 (proxy trust)

## Context
BR-AUTH-03: 5 failed attempts per **username + IP** per 5 minutes → `TOO_MANY_ATTEMPTS` (429). OQ-30: a correct
password during lockout is still refused; a successful login clears the counter; `USER_DISABLED` is only revealed
after a correct password. The API runs as 2 gunicorn workers (ADR-0002), so per-process memory counters are wrong.
DRF's `AnonRateThrottle` counts **requests**, not failures, and is keyed by IP only — it cannot express BR-AUTH-03.

## Decision
1. **BR-AUTH-03 is a domain rule, implemented in `apps/users`**, not as a DRF throttle:
   - table `users_loginfailure(id, username_normalized, ip, created_at)` with an index on
     `(username_normalized, ip, created_at)`;
   - login service order: (a) count failures for `(lower(username), ip)` with `created_at > now − 5 min`; if ≥ 5 →
     `429 TOO_MANY_ATTEMPTS` with `Retry-After` = seconds until the oldest counted failure leaves the window —
     **before** checking the password; (b) verify credentials; on failure insert a row → `401 INVALID_CREDENTIALS`
     (same body for unknown user and wrong password, and a dummy argon2 verify for unknown users to equalise timing);
     (c) on correct password with a DISABLED user → `403 USER_DISABLED` (this is not a failure row);
     (d) on success delete that `(username, ip)`'s rows.
   - Limits are constants in code (5, 300 s), **not** env vars — they are business rules.
   - Rows older than 1 day are purged opportunistically on successful login (no cron needed).
2. **Client IP**: right-most `X-Forwarded-For` hop with `NUM_PROXIES=1` (nginx), falling back to `REMOTE_ADDR`.
   One helper, `common/net.py → client_ip(request)`, used by both BR-AUTH-03 and DRF throttles.
3. **Generic DRF throttling** (DRF_SKILL §62–69) protects everything else: `AnonRateThrottle` (`RATELIMIT_ANON`,
   default 60/min), `UserRateThrottle` (`RATELIMIT_USER`, 300/min), scoped `auth` (`RATELIMIT_AUTH`, 30/min, on
   login/refresh/logout), `health` (`RATELIMIT_HEALTH`, 120/min). Cache: Django `DatabaseCache` table `django_cache`
   (shared by all workers, no Redis). Tests use `LocMemCache`.
4. Every 429 uses the §9 code `TOO_MANY_ATTEMPTS` (there is no other 429 code in BR §9) with `details.retry_after_seconds`.

## Consequences
- AC-13 is deterministic: 5 wrong passwords then a 6th attempt → 429 regardless of password.
- QA runs from the server's single IP; the generic `RATELIMIT_*` values can be raised in `.env` during QA
  (ADR-0004), BR-AUTH-03 cannot.
- The generic `RATELIMIT_USER`/`RATELIMIT_ANON` defaults must stay well above normal POS traffic: a throttle must never
  block normal cashier work (contract review #13, D6).
- The generic auth throttle (30/min) is looser than BR-AUTH-03 per username but also caps password spraying across
  many usernames from one IP.
