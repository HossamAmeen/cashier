# Simple POS — Operations Runbook

This document describes routine operation, backup management, deployment verification, and recovery procedures for Simple POS.

---

## 1. System Architecture & Domains

| Service | Domain / URL | Reverse Proxy Target |
|---|---|---|
| **Web App (PWA)** | `https://cashier.hossam-ameen.online` | `http://127.0.0.1:8121` |
| **Backend API** | `https://api.cashier.hossam-ameen.online` | `http://127.0.0.1:8120` |
| **Health Endpoint** | `https://api.cashier.hossam-ameen.online/api/health` | `http://127.0.0.1:8120/api/health` |

---

## 2. Health Monitoring & Verification

Verify health of the running API service:
```bash
curl -f -H "X-Health-Check-Token: <SECRET>" https://api.cashier.hossam-ameen.online/api/health
```
Expected HTTP 200 response:
```json
{
  "success": true,
  "message": "OK",
  "data": { "status": "healthy" }
}
```

---

## 3. Automated Backups & Restore Procedure

### Daily Backup Execution
Backups run automatically via `infra/scripts/backup.sh`.
- Daily backups destination: `/opt/simple-pos/backups/daily/` (retains last 7 days)
- Weekly backups destination: `/opt/simple-pos/backups/weekly/` (retains last 4 weeks)

To manually trigger a backup:
```bash
sudo bash /opt/simple-pos/infra/scripts/backup.sh
```

### Database Restore Procedure
To restore from a backup file:
```bash
gunzip -c /opt/simple-pos/backups/daily/pos_backup_<TIMESTAMP>.sql.gz | docker exec -i simple-pos-db psql -U pos -d pos
```

---

## 4. Disaster Recovery & Emergency Contacts

- Primary SysAdmin: devops@hossam-ameen.online
- Host VPS: GCP Compute Engine `34.123.215.195` (Ubuntu 24.04)
