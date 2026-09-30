# ADR-0011 — Sessions: 15-min JWT access + rotating refresh cookie, immediate revocation

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-AUTH-01..04, BR-USR-01, BR-SHIFT-09, OQ-6, OQ-29, OQ-31, OQ-37; CLAUDE.md §4; ADR-0003

## Decision
1. **Tokens** (simplejwt): access token lifetime 15 min (`JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15`), refresh token
   7 days (`JWT_REFRESH_TOKEN_LIFETIME_DAYS=7`), `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`
   (`rest_framework_simplejwt.token_blacklist`), signing key = `JWT_SIGNING_KEY` env (not `SECRET_KEY`).
2. **Transport**: `POST /api/auth/login` returns `{access_token, access_expires_in, user}` in the body and sets the
   refresh cookie (ADR-0003). `POST /api/auth/refresh` reads the cookie, rotates it, returns a new access token and the
   user. `POST /api/auth/logout` blacklists the cookie's refresh token and clears the cookie (204). The PWA keeps the
   access token in memory and calls refresh on start-up and on a 401.
3. **"تذكرني" (OQ-6)**: `remember_me=true` → cookie `Max-Age=604800`; `false` → session cookie. A `remember` claim in
   the refresh token keeps the choice across rotations.
4. **Immediate revocation (BR-AUTH-02, OQ-31, OQ-37)**: `User.token_version` (int). Both tokens carry a `tv` claim.
   A custom authentication class (`apps/users/authentication.py`) rejects any access token whose `tv` ≠ the user's
   current `token_version` or whose user is not ACTIVE → `401 UNAUTHENTICATED`; refresh does the same check.
   `token_version` is incremented when a user is disabled, their password changes, or their role changes.
   So revocation takes effect on the very next request, not after 15 minutes.
5. **Multiple sessions** (OQ-29) are allowed; logout ends only the current device's refresh token.
6. **Close shift (BR-SHIFT-09)**: after a successful close, the PWA shows the summary then calls logout; the server
   does not revoke other devices' sessions on close (OQ-29: logout never affects shifts; closing ends only this session).
7. **Passwords (BR-USR-01)**: `PASSWORD_HASHERS = [Argon2PasswordHasher, …]`; minimum length 8 enforced by the users
   serializer (Django validators are not used for business rules).
8. `last_login_at` is set on successful login only (not on refresh).

## Consequences
- One indexed DB read per authenticated request (the user row is loaded anyway by simplejwt's auth).
- Logout with an OPEN shift is allowed; the shift stays OPEN (OQ-29).
