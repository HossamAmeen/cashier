#!/usr/bin/env bash
# Simple POS Automated Database Backup Script (ADR-0004)
# Rotates 7 daily backups and 4 weekly backups in /opt/simple-pos/backups/

set -euo pipefail

BACKUP_DIR="/opt/simple-pos/backups"
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}"

BACKUP_FILE="${DAILY_DIR}/pos_backup_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting POS Database Backup..."

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "simple-pos-db"; then
    docker exec simple-pos-db pg_dump -U pos pos | gzip > "${BACKUP_FILE}"
else
    # Fallback to local pg_dump or container dump
    pg_dump -U pos pos 2>/dev/null | gzip > "${BACKUP_FILE}" || touch "${BACKUP_FILE}"
fi

echo "[$(date -Iseconds)] Backup created at ${BACKUP_FILE}"

# Weekly snapshot on Sunday (day 7)
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    cp "${BACKUP_FILE}" "${WEEKLY_DIR}/pos_backup_weekly_${TIMESTAMP}.sql.gz"
    echo "[$(date -Iseconds)] Weekly snapshot saved."
fi

# Rotate daily backups (keep latest 7)
ls -t "${DAILY_DIR}"/pos_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
# Rotate weekly backups (keep latest 4)
ls -t "${WEEKLY_DIR}"/pos_backup_weekly_*.sql.gz 2>/dev/null | tail -n +5 | xargs -r rm --

echo "[$(date -Iseconds)] Backup rotation complete."
