# Phase 0 — Inputs Check Report (P0-01)

- Date: 2026-09-28
- Run by: devops-engineer
- Scope: read-only checks. Nothing was changed on any server, and bootstrap was not run.
- Secrets: none in this file. `CLOUDFLARE_API_TOKEN` is empty.

## Verdict: FAIL. Phase 0 is blocked on owner input.

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | `infra/deploy.env` present and complete | PARTIAL | All required vars are set with real values. `CLOUDFLARE_API_TOKEN` is empty, which is fine because DNS is not on Cloudflare. There are two extra vars. `SERVER_IP` looks wrong (see 3). |
| 1b | `deploy.env` is gitignored | PASS | `.gitignore` line 6: `infra/deploy.env` |
| 2 | SSH key at `SSH_KEY_PATH` | FAIL | `~/.ssh/simple_pos_ed25519` does not exist. |
| 3 | SSH to `SERVER_IP` (4.123.215.195:22) | FAIL | The connection timed out, with and without `-i`. The IP does not answer on 22, 80, or 443. |
| 3b | OS / CPU / RAM / passwordless sudo | NOT CHECKED | The server was unreachable. |
| 4 | DNS `$DOMAIN`, `staging.$DOMAIN` → SERVER_IP | FAIL | No A records exist (NOERROR, empty). |
| 4b | DNS `cashier.*`, `api.cashier.*` | MISMATCH | Both resolve to **34.123.215.195**, not 4.123.215.195. `staging.cashier.*` has no record. |
| 4c | DNS provider | INFO | NS = `dns1/dns2.registrar-servers.com`. This is **Namecheap BasicDNS, not Cloudflare**. The Cloudflare API path does not apply, so records must be added by hand in Namecheap. |
| 5 | Ports 22/80/443 on 4.123.215.195 | FAIL (info) | All three timed out. |
| 5b | Ports 22/80/443 on 34.123.215.195 | OPEN (info) | nginx/1.24.0 (Ubuntu) is already serving 80/443 there. |

## Variables

| Var | Status |
|---|---|
| DOMAIN | `hossam-ameen.online`, set |
| SERVER_IP | `4.123.215.195`, set but unreachable, and DNS disagrees with it (probably a typo for `34.123.215.195`) |
| SSH_USER | `hossam`, set |
| SSH_PORT | `22`, set |
| SSH_KEY_PATH | `~/.ssh/simple_pos_ed25519`, set but **the file is missing** |
| ACME_EMAIL | set (real address, not a placeholder) |
| CLOUDFLARE_API_TOKEN | empty. Not needed, because DNS is on Namecheap. |
| FRONT_DOMAIN (extra) | `cashier.hossam-ameen.online`. The planned topology does not use it. |
| BACKEND_DOMAIN (extra) | `api.cashier.hossam-ameen.online`. The planned topology does not use it, because the API is same-origin under `/api`. |

## Key findings

1. **SERVER_IP is probably a typo.** Public DNS for `cashier.`, `api.cashier.`, `delivery.` and `api.delivery.hossam-ameen.online` all points to `34.123.215.195`, which is a Google Cloud VM. The local `~/.ssh/config` also has a `dental` host at `34.123.215.195` (user `hossam`). The configured `4.123.215.195` does not respond at all.
2. **34.123.215.195 is not an empty server.** nginx already runs on 80/443 there and serves a Let's Encrypt cert for `delivery.hossam-ameen.online` and `api.delivery.hossam-ameen.online`. The planned Caddy-on-80/443 topology would conflict with it. The owner must decide between these options:
   - use a fresh, dedicated VPS (the recommended option; it matches the constitution); or
   - share this VM, where Caddy takes over 80/443 and proxies the existing sites, or nginx fronts the POS. This needs an ADR from the team-lead.
3. **Apex `hossam-ameen.online` is unused.** It has no A/AAAA record, no `www` record, no wildcard, and no CAA record, and `curl` gets nothing back. It is free to use.
4. The SSH probe of 34.123.215.195 (OS, RAM, sudo) was **not run**. The permission system blocked it as a production read, so the specs of that host are unknown.

## Local `~/.ssh` (filenames only)
`authorized_keys`, `config`, `config.bak-2026-09-26`, `dental_github_actions(.pub)`, `google_compute_engine(.pub)`, `google_compute_known_hosts`, `id_ed25519(.pub)`, `id_ed25519_company(.pub)`, `known_hosts`, `known_hosts.old`. There is no `simple_pos_ed25519`.

## Owner action items
1. Confirm the target server IP: is it `34.123.215.195`, or a new VPS? Fix `SERVER_IP`.
2. If it is the existing 34.123.215.195 VM, confirm that sharing it with the delivery app (nginx on 80/443) is acceptable, and give its specs. The requirement is Ubuntu 24.04, 2 or more vCPU, and 4 GB or more RAM.
3. Provide the SSH key. Either create `~/.ssh/simple_pos_ed25519` and install its `.pub` on the server for `SSH_USER`, or set `SSH_KEY_PATH` to an existing key that works (for example `~/.ssh/id_ed25519`, which `~/.ssh/config` uses for the `dental` host).
4. Confirm that `SSH_USER` has passwordless sudo (`sudo -n true`).
5. Choose a hostname scheme, then add the A records in **Namecheap → Advanced DNS**. There is no proxy toggle, because this is not Cloudflare.

### Option (a): DOMAIN-based (matches the current topology)
| Type | Host (Namecheap) | FQDN | Value | TTL |
|---|---|---|---|---|
| A | `@` | hossam-ameen.online | `<SERVER_IP>` | 300 (5 min) |
| A | `staging` | staging.hossam-ameen.online | `<SERVER_IP>` | 300 (5 min) |

### Option (b): cashier-subdomain-based
Set `DOMAIN=cashier.hossam-ameen.online`. `FRONT_DOMAIN` and `BACKEND_DOMAIN` then become unnecessary.
| Type | Host (Namecheap) | FQDN | Value | TTL |
|---|---|---|---|---|
| A | `cashier` | cashier.hossam-ameen.online | `<SERVER_IP>` (it already exists as 34.123.215.195) | 300 |
| A | `staging.cashier` | staging.cashier.hossam-ameen.online | `<SERVER_IP>` | 300 |

The existing `api.cashier` record is not needed with same-origin `/api`. It can stay or be removed.

`<SERVER_IP>` = the corrected server IP from item 1.

## Owner decision — 2026-09-28
- Ignore `DOMAIN`. Hostnames are `FRONT_DOMAIN` (cashier.hossam-ameen.online, PWA) and `BACKEND_DOMAIN` (api.cashier.hossam-ameen.online, API).
- Consequence: web and API are on separate origins, so the API needs CORS restricted to FRONT_DOMAIN. The refresh cookie stays same-site (both are under hossam-ameen.online). The team-lead records this in an ADR in Phase 2.
- Proposed staging hosts (pending owner confirmation): staging.cashier.hossam-ameen.online and staging.api.cashier.hossam-ameen.online.
- Owner decision (2026-09-28): no staging environment for now. Only one environment on the server, at FRONT_DOMAIN and BACKEND_DOMAIN. Drop the staging DNS records from the Phase 0 checks.

## Re-run 2026-09-28

Scope, following the owner's decisions above: FRONT_DOMAIN and BACKEND_DOMAIN only, with no staging and no DOMAIN. `SERVER_IP` is now 34.123.215.195. Everything was read-only, and nothing on the server was changed.

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | `SERVER_IP` corrected in deploy.env | PASS | 34.123.215.195 |
| 2 | DNS `cashier.hossam-ameen.online` → SERVER_IP | PASS | 34.123.215.195 (default resolver and 1.1.1.1) |
| 3 | DNS `api.cashier.hossam-ameen.online` → SERVER_IP | PASS | 34.123.215.195 (default resolver and 1.1.1.1) |
| 4 | TCP 22/80/443 reachable | PASS | All three are open |
| 5 | SSH login (`-i ~/.ssh/id_ed25519`, hossam@:22) | BLOCKED | The Claude Code permission system refused the earlier SSH probe of this host as a "production read". It was not retried, as instructed. |
| 6 | Ubuntu 24.04 | UNKNOWN | Needs SSH. nginx reports `nginx/1.24.0 (Ubuntu)`, which is the stock package on Ubuntu 24.04. That is a hint, not proof. |
| 7 | ≥2 vCPU / ≥4 GB RAM / free disk | UNKNOWN | Needs SSH |
| 8 | Passwordless sudo | UNKNOWN | Needs SSH |
| 9 | Docker / compose present | UNKNOWN | Needs SSH |
| 10 | `SSH_KEY_PATH` file exists | FAIL | `~/.ssh/simple_pos_ed25519` is still missing. Update it to `~/.ssh/id_ed25519` if that key works. |

### How ports 80 and 443 are used today (external view, for the shared-server ADR)
- nginx/1.24.0 (Ubuntu) owns both 80 and 443.
- HTTPS serves one Let's Encrypt certificate: CN `api.delivery.hossam-ameen.online`, with SAN `delivery.hossam-ameen.online`, valid until 2026-12-26. Every SNI gets this certificate, including `cashier.*` and `api.cashier.*`, so neither cashier host has a certificate yet.
- `https://delivery.hossam-ameen.online` returns 200 and `https://api.delivery.hossam-ameen.online/` returns 404, so the delivery app is live. `http://delivery.*` returns a 301 redirect to HTTPS.
- `http://cashier.*` and `http://api.cashier.*` return 200 with the 615-byte nginx default page, which means the nginx default server is catching them.
- Implication: Caddy cannot bind 80/443 unless nginx gives them up. The options for the ADR are:
  - (i) Put the POS behind the existing nginx, with new server blocks for `cashier.*` and `api.cashier.*` proxying to the POS containers on localhost ports, plus certbot certificates for them.
  - (ii) Migrate the delivery vhosts into Caddy, and Caddy takes over 80/443.
  - (iii) Use a dedicated VPS.

  Options (i) and (ii) both touch the delivery app's ingress and need explicit owner approval. The internal listeners (DB and app ports), the contents of `sites-enabled`, and the host's resources are still unknown until SSH is allowed.

### Still blocking bootstrap
1. SSH access for the agent is not permitted yet. The owner must allow it, for example with a Bash permission rule for `ssh ... hossam@34.123.215.195`, or run the read-only probe themselves and paste the output. After that: OS, CPU, RAM, disk, sudo, Docker, listeners, and nginx sites.
2. Set `SSH_KEY_PATH` to a key that works (probably `~/.ssh/id_ed25519`).
3. Owner approval to share the server with the delivery app, plus a team-lead ADR on the ingress (nginx vs. Caddy on 80/443).
4. Passwordless sudo for `hossam` is unconfirmed.
- Owner decisions (2026-09-28):
  - Share server 34.123.215.195 with the existing delivery app. Default is option A: the existing nginx keeps 80/443 and gets server blocks for the cashier hosts, with certbot TLS. The delivery app must not be disrupted. Bootstrap must NOT reset ufw/sshd in ways that break the delivery app. The team-lead records this in an ADR.
  - Backend: Django REST Framework, following DRF_SKILL.md. This replaces NestJS/Prisma via an ADR, and CLAUDE.md §4 gets updated by the team-lead.
  - Frontend: PWA implementing the MVP PDF design (screens 01–20).
- Still open: SSH access for the agent (blocked by the permission system), and SSH_KEY_PATH.
