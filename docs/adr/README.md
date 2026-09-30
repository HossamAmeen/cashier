# Architecture Decision Records

Owner: team-lead. Format: context, decision, consequences. An ADR is never edited after it is accepted except to mark it
superseded; a new ADR replaces it.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-django-drf-backend.md) | Django/DRF backend per DRF_SKILL.md (replaces NestJS/Prisma) | Accepted |
| [0002](0002-shared-server-nginx-certbot.md) | Shared server behind the existing nginx + certbot; Docker Compose bound to localhost | Accepted |
| [0003](0003-separate-origins-cors-cookie-csrf.md) | Separate front/API origins: CORS, refresh cookie scope, CSRF | Accepted |
| [0004](0004-single-environment-qa-on-server.md) | Single environment (no staging); QA on the server pre-launch only | Accepted |
| [0005](0005-integer-money.md) | Money as integer minor units end to end (BR-GEN-01) | Accepted |
| [0006](0006-db-level-constraints.md) | DB-level integrity: partial unique indexes, one payment per order, sequences, checks, locks | Accepted |
| [0007](0007-payment-idempotency.md) | Idempotency storage for payments (BR-PAY-04) | Accepted |
| [0008](0008-contract-first-openapi-ci-diff.md) | Contract-first openapi.yaml + CI diff against drf-spectacular | Accepted |
| [0009](0009-login-rate-limiting.md) | Login rate limiting (BR-AUTH-03) and global DRF throttling | Accepted |
| [0010](0010-response-and-error-envelope.md) | Response and error envelope carrying BR §9 codes | Accepted |
| [0011](0011-sessions-jwt-revocation.md) | Sessions: 15-min JWT access + rotating refresh cookie, immediate revocation | Accepted |
| [0012](0012-frontend-pwa-stack.md) | Frontend PWA stack, generated API client, no offline mutations | Accepted |
| [0013](0013-time-and-business-day.md) | UTC storage, Africa/Cairo business day | Accepted |
