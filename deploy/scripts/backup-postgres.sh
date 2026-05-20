#!/usr/bin/env bash
# Nightly PostgreSQL backup for MED_Logistics production stack.
# Install cron (as root or deploy user with docker access):
#   0 2 * * * /home/adminmed/MED_Logistics/deploy/scripts/backup-postgres.sh >> /var/log/med-warehouse-backup.log 2>&1
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/deploy/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER="${POSTGRES_CONTAINER:-med_warehouse_db_prod}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

mkdir -p "${BACKUP_DIR}"
DUMP_FILE="${BACKUP_DIR}/${POSTGRES_DB:-med_warehouse}_${TIMESTAMP}.sql.gz"

echo "[$(date -u -Iseconds)] Starting backup -> ${DUMP_FILE}"

docker exec "${CONTAINER}" pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-med_warehouse}" \
  --no-owner \
  --no-acl \
  | gzip -9 > "${DUMP_FILE}"

echo "[$(date -u -Iseconds)] Backup complete ($(du -h "${DUMP_FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name '*.sql.gz' -type f -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date -u -Iseconds)] Retention cleanup (>${RETENTION_DAYS} days)"
