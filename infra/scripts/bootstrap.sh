#!/usr/bin/env bash
# Simple POS: additive server bootstrap for the SHARED host (delivery + dental apps already live).
#
# Run ON THE SERVER, from a copy of the repo's infra/ directory:
#   sudo ACME_EMAIL=you@example.com bash infra/scripts/bootstrap.sh --dry-run   # print only
#   sudo ACME_EMAIL=you@example.com bash infra/scripts/bootstrap.sh             # apply
#
# Idempotent and additive. It never restarts nginx (reload only, after `nginx -t` passes). It never
# touches other nginx sites, existing certificates, sshd, ufw, or the other apps' services.
# See infra/README.md for the step order, verification and rollback.
set -euo pipefail

# ---------- configuration ----------
FRONT_DOMAIN="${FRONT_DOMAIN:-cashier.hossam-ameen.online}"
BACKEND_DOMAIN="${BACKEND_DOMAIN:-api.cashier.hossam-ameen.online}"
CERT_NAME="simple-pos"
APP_ROOT="/opt/simple-pos"
APP_OWNER="${APP_OWNER:-${SUDO_USER:-hossam}}"
SWAPFILE="/swapfile"
SWAP_SIZE="2G"
WEBROOT="/var/www/certbot"
NGINX_AVAIL="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
BACKUP_DIR="/var/backups/simple-pos-bootstrap"
# Sites that must keep responding (any HTTP status < 500 counts as healthy).
NEIGHBOUR_URLS=(
  "https://delivery.hossam-ameen.online/"
  "https://api.delivery.hossam-ameen.online/"
  "https://dental.hossam-ameen.online/"
  "https://api.dental.hossam-ameen.online/"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_SRC="${SCRIPT_DIR}/../nginx"
DRY_RUN=0
SKIP_SWAP=0
TS="$(date -u +%Y%m%dT%H%M%SZ)"

usage() {
  cat <<EOF
Usage: sudo ACME_EMAIL=<email> bash $0 [--dry-run] [--skip-swap]
  --dry-run    print every action without changing anything (no root needed)
  --skip-swap  do not create the ${SWAP_SIZE} swapfile
Env overrides: FRONT_DOMAIN, BACKEND_DOMAIN, APP_OWNER, ACME_EMAIL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --skip-swap) SKIP_SWAP=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# ---------- helpers ----------
log()  { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# run <cmd...>: execute, or only print in dry-run mode.
run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '    [dry-run] %s\n' "$*"
  else
    printf '    + %s\n' "$*"
    "$@"
  fi
}

# check_neighbours: every neighbour URL must answer with a status < 500.
check_neighbours() {
  local url code failed=0
  for url in "${NEIGHBOUR_URLS[@]}"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || true)"
    if [[ "$code" =~ ^[1-4][0-9][0-9]$ ]]; then
      info "OK   ${code}  ${url}"
    else
      info "FAIL ${code:-000}  ${url}"
      failed=1
    fi
  done
  return "$failed"
}

nginx_test_and_reload() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] nginx -t && systemctl reload nginx"
    return 0
  fi
  if nginx -t 2>&1 | sed 's/^/    /'; then   # pipefail: fails if nginx -t fails
    run systemctl reload nginx
    sleep 2
  else
    return 1
  fi
}

# install_site <host> <variant-src-file>: install the site file, enable it, then test and reload.
# If `nginx -t` fails, the previous file (or none) is restored and the script aborts.
install_site() {
  local host="$1" src="$2"
  local dst="${NGINX_AVAIL}/${host}.conf" link="${NGINX_ENABLED}/${host}.conf"
  [[ -f "$src" ]] || die "missing template ${src}"

  if [[ -f "$dst" ]] && cmp -s "$src" "$dst" && [[ -L "$link" ]]; then
    info "${host}: already up to date (${dst})"
    return 0
  fi

  local backup=""
  if [[ -f "$dst" ]]; then
    backup="${BACKUP_DIR}/${host}.conf.${TS}"
    run install -d -m 0755 "$BACKUP_DIR"
    run cp -a "$dst" "$backup"
  fi
  run install -m 0644 -o root -g root "$src" "$dst"
  run ln -sfn "$dst" "$link"

  if ! nginx_test_and_reload; then
    info "nginx -t FAILED; restoring the previous state for ${host}"
    if [[ -n "$backup" ]]; then
      cp -a "$backup" "$dst"
    else
      rm -f "$link" "$dst"
    fi
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    die "nginx config test failed for ${host}; nothing else was changed"
  fi
}

cert_present() {
  [[ -f "/etc/letsencrypt/live/${CERT_NAME}/fullchain.pem" ]]
}

# ---------- step 0: preflight ----------
log "Step 0: preflight"
if [[ "$DRY_RUN" -eq 0 && "$EUID" -ne 0 ]]; then
  die "run as root (sudo), or use --dry-run"
fi
[[ -n "${ACME_EMAIL:-}" ]] || die "ACME_EMAIL is not set (export it, or pass it as ACME_EMAIL=... before the command)"
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]] || info "WARN: expected Ubuntu 24.04, found ${PRETTY_NAME:-unknown}"
fi
for bin in nginx certbot curl; do
  command -v "$bin" >/dev/null 2>&1 || die "'${bin}' is not installed; this script does not install it (by design)"
done
for f in "${NGINX_SRC}/bootstrap/${FRONT_DOMAIN}.conf" "${NGINX_SRC}/bootstrap/${BACKEND_DOMAIN}.conf" \
         "${NGINX_SRC}/${FRONT_DOMAIN}.conf" "${NGINX_SRC}/${BACKEND_DOMAIN}.conf"; do
  [[ -f "$f" ]] || die "missing nginx template ${f}"
done
if [[ "$DRY_RUN" -eq 0 ]]; then
  nginx -t >/dev/null 2>&1 || die "nginx -t fails BEFORE any change; fix the existing config first"
  [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]] || die "/etc/letsencrypt/options-ssl-nginx.conf is missing (needed by the final site files)"
fi
info "front=${FRONT_DOMAIN} backend=${BACKEND_DOMAIN} cert=${CERT_NAME} owner=${APP_OWNER} dry_run=${DRY_RUN}"
info "baseline health of the neighbouring apps:"
check_neighbours || die "a neighbouring app is ALREADY unhealthy before any change; not proceeding"

# ---------- step 1: swapfile ----------
log "Step 1: ${SWAP_SIZE} swapfile at ${SWAPFILE}"
if [[ "$SKIP_SWAP" -eq 1 ]]; then
  info "skipped (--skip-swap)"
elif swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAPFILE"; then
  info "already active"
else
  if [[ ! -f "$SWAPFILE" ]]; then
    run fallocate -l "$SWAP_SIZE" "$SWAPFILE"
    run chmod 600 "$SWAPFILE"
    run mkswap "$SWAPFILE"
  fi
  run swapon "$SWAPFILE"
fi
if [[ "$SKIP_SWAP" -eq 0 ]]; then
  if grep -qE "^${SWAPFILE}[[:space:]]" /etc/fstab; then
    info "fstab entry present"
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] append '${SWAPFILE} none swap sw 0 0' to /etc/fstab"
  else
    cp -a /etc/fstab "/etc/fstab.simple-pos.${TS}"
    echo "${SWAPFILE} none swap sw 0 0" >> /etc/fstab
    info "appended fstab entry (backup: /etc/fstab.simple-pos.${TS})"
  fi
fi

# ---------- step 2: Docker (TODO, intentionally disabled) ----------
log "Step 2: Docker Engine + compose plugin: SKIPPED (owner decision 2026-09-29: 'ignore docker for now')"
# TODO(devops, needs owner go-ahead): uncomment when Docker is approved.
# install -m 0755 -d /etc/apt/keyrings
# curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
# chmod a+r /etc/apt/keyrings/docker.asc
# echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
#   > /etc/apt/sources.list.d/docker.list
# apt-get update
# apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# [[ -f /etc/docker/daemon.json ]] || printf '%s\n' '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
# systemctl restart docker    # docker only; nothing else uses Docker on this host
# usermod -aG docker "$APP_OWNER"

# ---------- step 3: /opt/simple-pos layout ----------
log "Step 3: ${APP_ROOT} layout"
for d in "$APP_ROOT" "$APP_ROOT/production" "$APP_ROOT/production/releases" \
         "$APP_ROOT/backups" "$APP_ROOT/backups/daily" "$APP_ROOT/backups/weekly" "$APP_ROOT/qa"; do
  if [[ -d "$d" ]]; then
    info "exists: ${d}"
  else
    run install -d -m 0750 -o "$APP_OWNER" -g "$APP_OWNER" "$d"
  fi
done
# Secrets (.env) are generated later by deploy.sh on the server with `openssl rand`; not here.

# ---------- step 4: ACME webroot ----------
log "Step 4: ACME webroot ${WEBROOT}"
if [[ -d "$WEBROOT" ]]; then info "exists"; else run install -d -m 0755 "$WEBROOT"; fi

# ---------- step 5: nginx HTTP-only bootstrap sites ----------
log "Step 5: nginx sites (HTTP-only bootstrap variant)"
if cert_present; then
  info "certificate '${CERT_NAME}' already exists; skipping the bootstrap variant"
else
  install_site "$FRONT_DOMAIN"   "${NGINX_SRC}/bootstrap/${FRONT_DOMAIN}.conf"
  install_site "$BACKEND_DOMAIN" "${NGINX_SRC}/bootstrap/${BACKEND_DOMAIN}.conf"
  info "post-step health of the neighbouring apps:"
  check_neighbours || die "a neighbouring app stopped responding after step 5; see README 'Rollback'"
fi

# ---------- step 6: certificate ----------
log "Step 6: Let's Encrypt certificate '${CERT_NAME}' (webroot)"
if cert_present; then
  info "already present; the existing certbot.timer handles renewal"
else
  run certbot certonly --webroot -w "$WEBROOT" \
    --cert-name "$CERT_NAME" -d "$FRONT_DOMAIN" -d "$BACKEND_DOMAIN" \
    --email "$ACME_EMAIL" --agree-tos --no-eff-email --non-interactive \
    --keep-until-expiring --deploy-hook "systemctl reload nginx"
fi

# ---------- step 7: nginx final HTTPS sites ----------
log "Step 7: nginx sites (final HTTPS variant -> 127.0.0.1:8121 web, 127.0.0.1:8120 api)"
if [[ "$DRY_RUN" -eq 0 ]] && ! cert_present; then
  die "certificate '${CERT_NAME}' is missing after step 6; not installing the HTTPS variant"
fi
install_site "$FRONT_DOMAIN"   "${NGINX_SRC}/${FRONT_DOMAIN}.conf"
install_site "$BACKEND_DOMAIN" "${NGINX_SRC}/${BACKEND_DOMAIN}.conf"

# ---------- step 8: verification ----------
log "Step 8: verification"
info "neighbouring apps:"
check_neighbours || die "a neighbouring app stopped responding after step 7; see README 'Rollback'"
if [[ "$DRY_RUN" -eq 0 ]]; then
  for h in "$FRONT_DOMAIN" "$BACKEND_DOMAIN"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://${h}/" || true)"
    info "https://${h}/ -> ${code} (502 is expected until the POS containers exist)"
  done
  run certbot renew --cert-name "$CERT_NAME" --dry-run
fi
log "Done (dry_run=${DRY_RUN})"
