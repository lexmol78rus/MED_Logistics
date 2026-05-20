# Production Hardening Report

**Stack:** MED_Logistics (postgres + api + web)  
**Verified:** 2026-05-20  
**Compose:** `docker-compose.prod.yml` + `deploy/.env`

---

## 1. Integration debug logging (disabled)

| Setting | Value |
|---------|-------|
| `INTEGRATION_DEBUG` | `false` in `deploy/.env` |
| API container env | Confirmed `INTEGRATION_DEBUG=false` |

**Verification**

- No `prisma:query` lines in API logs after authenticated CRUD
- No `IntegrationDebug` request/response spam
- Normal Nest/Pino `level:30` application logs only

Re-enable temporarily only for incident response: set `INTEGRATION_DEBUG=true`, then `docker compose ... up -d --force-recreate api`.

---

## 2. Restart behavior

**Test:** `docker compose -f docker-compose.prod.yml --env-file deploy/.env restart`

| Check | Result |
|-------|--------|
| Postgres healthy | Yes (`healthy`) |
| API reconnects | Yes — `/api/v1/health/ready` → `database: up` |
| Frontend available | Yes — `/health` → `ok`, port 80 |
| Migration loops | No — `prisma migrate deploy` runs once per API start; 2 occurrences = recreate + restart, not a loop |
| Container restart loops | No — `RestartCount=0` on all services after test |

---

## 3. Persistent storage

**Test:** Created product `PERSIST-*` via API, restarted full stack, fetched by ID.

| Check | Result |
|-------|--------|
| Product survives restart | Yes |
| Volume | `med_warehouse_pg_prod` (named Docker volume) |

---

## 4. Web container healthcheck

Added to `docker-compose.prod.yml`:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1/health || exit 1"]
```

**Verification:** `docker ps` shows `med_warehouse_web_prod` as **(healthy)**.

---

## 5. Backup automation

**Script:** `deploy/scripts/backup-postgres.sh`

- Dumps via `pg_dump` inside `med_warehouse_db_prod`
- Output: `deploy/backups/<db>_<UTC-timestamp>.sql.gz`
- Retention: deletes `*.sql.gz` older than **7 days** (override with `RETENTION_DAYS`)

**Manual run:**

```bash
cd /home/adminmed/MED_Logistics
./deploy/scripts/backup-postgres.sh
```

**Recommended cron** (host user with Docker access, e.g. `adminmed`):

```cron
0 2 * * * /home/adminmed/MED_Logistics/deploy/scripts/backup-postgres.sh >> /var/log/med-warehouse-backup.log 2>&1
```

Install: `crontab -e` (user) or `/etc/cron.d/med-warehouse-backup` (system).

**Restore (disaster recovery sketch):**

```bash
gunzip -c deploy/backups/med_warehouse_YYYYMMDDTHHMMSSZ.sql.gz | \
  docker exec -i med_warehouse_db_prod psql -U med_warehouse -d med_warehouse
```

Stop API during restore to avoid concurrent writes.

---

## 6. Secret exposure

| Surface | Result |
|---------|--------|
| Frontend JS bundle | JWT/DB/Gemini secrets **not** present |
| Nginx `default.conf` | No credentials; proxies `/api/` only |
| `index.html` | No embedded secrets |
| Build-time frontend vars | Only `VITE_API_URL`, `VITE_APP_ENV` (public) |

**Browser DevTools:** After login, users hold **access/refresh tokens** in client storage — expected. Server secrets (`JWT_*_SECRET`, `POSTGRES_PASSWORD`) must never appear in Network tab response bodies for static assets or in Sources.

**Operational:** `deploy/.env` is gitignored; rotate secrets if this file was ever committed or shared.

---

## 7. Security notes

- **Auth:** JWT access + refresh; API behind nginx same-origin proxy (`/api/v1`).
- **Rate limiting:** `THROTTLE_TTL` / `THROTTLE_LIMIT` on API.
- **DB:** Postgres not required on public internet — consider binding `POSTGRES_PORT` to `127.0.0.1` only in hardened deployments.
- **API port:** `3000` exposed on host — restrict with firewall if nginx on `:80` is the only public entry.
- **TLS:** Terminate HTTPS at reverse proxy (Caddy/Traefik/nginx + certbot) in front of port 80.
- **Secrets:** Generate via `deploy/scripts/generate-prod-env.sh`; minimum 32-char JWT secrets.
- **Containers:** API runs as non-root `node` user.
- **Debug:** Keep `INTEGRATION_DEBUG=false` in production.

---

## 8. Backup notes

- Backups stored under `deploy/backups/` (gitignored).
- Test restore quarterly on a staging clone.
- Copy backups off-host (S3, rsync, another machine) — local disk loss = data loss.
- Backup includes schema + data; no owner/ACL flags for portable restore.

---

## 9. Recovery notes

| Scenario | Action |
|----------|--------|
| Single container crash | `docker compose ... up -d` (restart policy: `always`) |
| Full host reboot | Docker starts containers; verify `docker ps` all healthy |
| Corrupt DB / bad migration | Restore from latest `.sql.gz`; redeploy API image matching migration history |
| Lost volume | Recreate volume + restore backup + `prisma migrate deploy` + optional `db seed` |
| Bad deploy | `docker compose ... up -d --build` previous image tag or git checkout |

**Health endpoints**

- Web: `GET /health`
- API liveness: `GET /api/v1/health/live`
- API readiness: `GET /api/v1/health/ready`

---

## 10. Recommended Ubuntu updates

Run monthly (maintenance window):

```bash
sudo apt update
sudo apt list --upgradable
sudo apt upgrade -y
sudo apt autoremove -y
```

Prioritize: **kernel**, **openssh**, **openssl/libssl**, **unattended-upgrades** for security patches.

Reboot if kernel updated: `sudo needs-restarting -r` (if `needrestart` installed) or check `/var/run/reboot-required`.

---

## 11. Docker update strategy

**Current:** Docker Engine 29.x (verify with `docker --version`).

| Practice | Recommendation |
|----------|----------------|
| Engine updates | Quarterly; test `docker compose restart` on staging first |
| Image pins | Postgres `16-alpine`, nginx `1.27-alpine`, node `20-bookworm-slim` — bump intentionally, not `:latest` |
| Rebuild | `docker compose -f docker-compose.prod.yml --env-file deploy/.env up -d --build` after base image bumps |
| Prune | `docker image prune` after verified deploy; avoid pruning named volumes |
| Compose | Use Compose v2 plugin (`docker compose`, not legacy `docker-compose`) |

After Docker daemon upgrade: restart stack once and confirm all three healthchecks green.

---

## Quick verification checklist

```bash
cd /home/adminmed/MED_Logistics
export COMPOSE="docker compose -f docker-compose.prod.yml --env-file deploy/.env"

$COMPOSE ps                    # all healthy
curl -sf localhost/health
curl -sf localhost/api/v1/health/ready
grep INTEGRATION_DEBUG deploy/.env   # false
./deploy/scripts/backup-postgres.sh
```
