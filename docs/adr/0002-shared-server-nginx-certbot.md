# ADR-0002 — Shared server behind the existing nginx + certbot; Docker Compose bound to localhost

- Status: Accepted (team-lead, 2026-09-29)
- Supersedes: the Caddy "edge" topology in the original devops-engineer definition
- Refs: owner decision 2026-09-28, infra/PHASE0_REPORT.md (re-run 2026-09-29), CLAUDE.md §4 Infra, §7

## Context
Server `34.123.215.195` (Ubuntu 24.04.5, 2 vCPU, 3.8 GiB RAM, no swap) already hosts two live tenants — the delivery
app and the dental-clinic app — behind nginx 1.24 on 80/443 with certbot certificates. nginx must keep 80/443; Caddy
cannot bind them. The owner chose to share this host (option A: existing nginx + new server blocks + certbot).

## Decision
1. **Ingress**: the existing nginx gets two **new** server-block files (created by devops, additive only):
   `cashier.hossam-ameen.online` → `127.0.0.1:8121` (web) and `api.cashier.hossam-ameen.online` → `127.0.0.1:8120` (API).
   TLS from a separate certbot certificate named `simple-pos` (webroot). Only `nginx -t && systemctl reload nginx`;
   never restart, never edit other tenants' files. No Caddy anywhere.
2. **Containers**: one Docker Compose project (`simple-pos`) with services `db` (postgres:16, named volume, **no host
   port**), `api` (gunicorn, published as `127.0.0.1:8120:8000`), `web` (nginx serving the static PWA build,
   `127.0.0.1:8121:80`). Every published port is bound to `127.0.0.1` explicitly. The template is
   `docker-compose.yml` at the repo root; devops owns the server copy under `/opt/simple-pos/`.
3. **Proxy trust**: nginx appends the client address with `proxy_add_x_forwarded_for`. Django trusts exactly one proxy
   hop (`NUM_PROXIES=1`, i.e. the right-most `X-Forwarded-For` entry) and `SECURE_PROXY_SSL_HEADER`
   = `X-Forwarded-Proto: https`. This is the client IP used by BR-AUTH-03 (ADR-0009).
4. **Resource budget** (PHASE0 W1): gunicorn 2 workers (`GUNICORN_WORKERS`), Postgres `shared_buffers=128MB`,
   Docker json-file logs 10m × 3, no Redis/Celery.
5. **Django static files** (jazzmin/admin, drf-spectacular docs): the `api` container runs `collectstatic` into a
   bind mount `${STATIC_PATH}` (default `/opt/simple-pos/static`), and the API server block adds
   `location /static/ { alias ${STATIC_PATH}/; }`. gunicorn never serves static files. The PWA is served only by the
   `web` container.

## Consequences
- The delivery and dental apps are never touched; the devops bootstrap verifies both stay healthy after every step.
- Until the containers exist, both cashier hosts answer 502 — harmless.
- A container restart does not affect other tenants; a host reboot does (shared blast radius, accepted by the owner).
- `ALLOWED_HOSTS` = `api.cashier.hossam-ameen.online` (plus `localhost`/`127.0.0.1` for the in-container healthcheck).
