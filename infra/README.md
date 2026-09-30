# infra/ — Simple POS server setup

Target: the **shared** host `34.123.215.195` (Ubuntu 24.04). The delivery app (`delivery.*`, `api.delivery.*`) and the dental app (`dental.*`, `api.dental.*`) already run there behind the existing nginx. The POS is added **alongside** them. Nothing that belongs to the other apps is modified.

| Host | nginx → upstream |
|---|---|
| `cashier.hossam-ameen.online` (PWA) | `127.0.0.1:8121` |
| `api.cashier.hossam-ameen.online` (API) | `127.0.0.1:8120` |

Until the POS containers exist, both hosts return **502**. That is expected.

## Files
| Path | Purpose |
|---|---|
| `deploy.env.example` | Template for `deploy.env`. The real file is gitignored and holds no secrets beyond the SSH key path. |
| `scripts/bootstrap.sh` | Idempotent, additive bootstrap. Supports `--dry-run` and `--skip-swap`. |
| `nginx/bootstrap/<host>.conf` | HTTP-only variant. It serves ACME challenges only and returns 404 for everything else. |
| `nginx/<host>.conf` | Final variant: HTTP → HTTPS redirect, TLS with the `simple-pos` cert, and the reverse proxy. |
| `PHASE0_REPORT.md` | Phase 0 findings (server probe, ports, neighbouring apps). |

## What bootstrap does NOT touch
- The `delivery*`, `dental*` and `default` nginx sites, `nginx.conf`, and `conf.d/`
- The existing certs `flash-delivery` and `dental.hossam-ameen.online`
- `flash-backend.service`, `dental-clinic-backend.service`, ports 8000 and 8010, `/srv/flash`, and `/var/www/html`
- sshd, ufw (stays inactive; the GCP firewall does the filtering), and sudoers
- nginx is only ever **reloaded**, after `nginx -t` passes. It is never restarted.
- Docker is **not installed** yet (owner decision 2026-09-29). The step is a commented-out TODO in the script.

## Prerequisites (on the server)
- `nginx`, `certbot` and `curl` are installed. All three are already present on this host.
- DNS A records for both cashier hosts point to the server. They already do.
- A `sudo` user. `hossam` has passwordless sudo.

## Running it (manually, by the owner)
```bash
# from your machine: copy infra/ to the server (no secrets inside)
scp -r -i ~/.ssh/id_ed25519 infra/scripts infra/nginx hossam@34.123.215.195:~/simple-pos-infra/

# on the server
ssh -i ~/.ssh/id_ed25519 hossam@34.123.215.195
cd ~/simple-pos-infra
sudo ACME_EMAIL='<your email>' bash scripts/bootstrap.sh --dry-run   # 1) review the plan
sudo ACME_EMAIL='<your email>' bash scripts/bootstrap.sh             # 2) apply
```
The script stops on the first error (`set -euo pipefail`). You can safely re-run it, because completed steps are detected and skipped.

## Step order
| # | Step | Idempotency check |
|---|---|---|
| 0 | Preflight: root; Ubuntu 24.04; nginx/certbot/curl installed; `nginx -t` passes; `options-ssl-nginx.conf` exists; **delivery + dental respond** (baseline) | Aborts if anything is already broken |
| 1 | 2 GiB `/swapfile` plus an `/etc/fstab` entry (fstab is backed up first) | Skipped if already active or present |
| 2 | Docker: **skipped (TODO)** | n/a |
| 3 | `/opt/simple-pos/{production/releases,backups/{daily,weekly},qa}`, owned by `$SUDO_USER`, mode 750 | Existing directories are left alone |
| 4 | ACME webroot `/var/www/certbot` | Skipped if it exists |
| 5 | Install the HTTP-only site files and symlink them into `sites-enabled`, then `nginx -t` and reload. Re-check neighbours. | Skipped once the cert exists. Identical files are not rewritten. |
| 6 | `certbot certonly --webroot --cert-name simple-pos -d cashier… -d api.cashier…` with a deploy-hook `systemctl reload nginx` | Skipped if `/etc/letsencrypt/live/simple-pos/` exists |
| 7 | Install the final HTTPS site files, then `nginx -t` and reload | Identical files are not rewritten |
| 8 | Verify: neighbours respond, the cashier hosts answer (502 expected), and `certbot renew --cert-name simple-pos --dry-run` succeeds | — |

Before a site file is overwritten, the previous version is copied to `/var/backups/simple-pos-bootstrap/<host>.conf.<timestamp>`. If `nginx -t` fails, the script restores the previous file (or removes the new one), reloads, and aborts.

## Verify (after the run)
```bash
curl -sI https://delivery.hossam-ameen.online      | head -1   # 200
curl -sI https://dental.hossam-ameen.online        | head -1   # 200
curl -sI https://api.delivery.hossam-ameen.online/ | head -1   # 404 (unchanged)
curl -sI http://cashier.hossam-ameen.online        | head -1   # 301 -> https
curl -sI https://cashier.hossam-ameen.online       | head -1   # 502 until containers exist
echo | openssl s_client -connect cashier.hossam-ameen.online:443 -servername cashier.hossam-ameen.online 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName          # cashier + api.cashier
sudo certbot certificates    # flash-delivery, dental.hossam-ameen.online, simple-pos
swapon --show; ls -l /opt/simple-pos
```

## Rollback (per step, all on the server with sudo)
| Step | Rollback |
|---|---|
| 1 swap | `sudo swapoff /swapfile && sudo rm /swapfile`, then remove the `/swapfile` line from `/etc/fstab`. A backup is at `/etc/fstab.simple-pos.<timestamp>`. |
| 3 layout | `sudo rm -r /opt/simple-pos`. Only do this while it is still empty; later it holds data and backups. |
| 4 webroot | `sudo rmdir /var/www/certbot` |
| 5 / 7 nginx sites | `sudo rm /etc/nginx/sites-enabled/{cashier,api.cashier}.hossam-ameen.online.conf /etc/nginx/sites-available/{cashier,api.cashier}.hossam-ameen.online.conf && sudo nginx -t && sudo systemctl reload nginx`. The cashier hosts then fall back to the nginx default page, as they did before. To go back to the previous variant instead, copy it from `/var/backups/simple-pos-bootstrap/`. |
| 6 certificate | First remove the sites (step 5/7 rollback), because they reference the cert. Then run `sudo certbot delete --cert-name simple-pos`. **Never** delete `flash-delivery` or `dental.hossam-ameen.online`. |

If a neighbouring app stops responding at any point, roll back steps 7 → 5 first. Those are the only steps that touch shared nginx.

## Not yet written
`scripts/deploy.sh`, `scripts/qa-remote.sh`, the compose files, backup cron, and `RUNBOOK.md`. They follow once Docker is approved and the Phase 2 ADRs are in place.
