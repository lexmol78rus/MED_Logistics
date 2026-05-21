#!/usr/bin/env bash
# Full production redeploy: clean frontend dist, rebuild images (no cache), migrate DB, verify bundles.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run: bash deploy/scripts/generate-prod-env.sh" >&2
  exit 1
fi

dc() {
  if sg docker -c "docker compose -f \"$COMPOSE_FILE\" --env-file \"$ENV_FILE\" $*" 2>/dev/null; then
    return 0
  fi
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

docker_prune() {
  if sg docker -c "docker builder prune -af && docker image prune -af" 2>/dev/null; then
    return 0
  fi
  docker builder prune -af
  docker image prune -af
}

echo "==> Stopping stack..."
dc down

echo "==> Removing stale web container/image (if present)..."
sg docker -c "docker rm -f med_warehouse_web_prod 2>/dev/null || true" 2>/dev/null || docker rm -f med_warehouse_web_prod 2>/dev/null || true

echo "==> Pruning Docker build cache..."
docker_prune

echo "==> Cleaning host frontend artifacts..."
rm -rf frontend/dist frontend/node_modules/.vite frontend/.env.build

echo "==> Rebuilding api + web (no cache)..."
dc build --no-cache api web

echo "==> Starting stack..."
dc up -d

echo "==> Waiting for API health..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:3000/api/v1/health/live >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Applying Prisma migrations..."
dc exec -T api npx prisma migrate deploy

echo "==> Verifying deployment..."
WEB_JS="$(curl -sf http://127.0.0.1/ | grep -oE '/assets/index-[^\"]+\.js' | head -1 || true)"
CONTAINER_JS="$(sg docker -c "docker exec med_warehouse_web_prod ls /usr/share/nginx/html/assets/index-*.js 2>/dev/null" 2>/dev/null | xargs -I{} basename {} || true)"
VERSION="$(curl -sf http://127.0.0.1/version.json 2>/dev/null || echo '{}')"
HAS_DEST="$(sg docker -c "docker exec med_warehouse_web_prod sh -c 'grep -q \"Куда списываем\" /usr/share/nginx/html/assets/index-*.js && echo yes || echo no'" 2>/dev/null || echo 'unknown')"
HAS_LOCALE="$(sg docker -c "docker exec med_warehouse_web_prod sh -c 'grep -q \"Содержит\" /usr/share/nginx/html/assets/index-*.js && echo yes || echo no'" 2>/dev/null || echo 'unknown')"
DB_COLS="$(sg docker -c "docker exec med_warehouse_db_prod psql -U med_warehouse -d med_warehouse -tAc \"SELECT column_name FROM information_schema.columns WHERE table_name='stock_movements' AND column_name IN ('write_off_destination','write_off_comment')\"" 2>/dev/null | tr '\n' ' ' || echo 'unknown')"

echo ""
echo "========== DEPLOY REPORT =========="
echo "index.html JS:     ${WEB_JS:-MISSING}"
echo "container JS file: ${CONTAINER_JS:-MISSING}"
echo "version.json:      ${VERSION}"
echo "UI «Куда списываем»: ${HAS_DEST}"
echo "AG Grid «Содержит»:  ${HAS_LOCALE}"
echo "DB columns:          ${DB_COLS}"
echo "=================================="

if [[ "${HAS_DEST}" != "yes" || "${HAS_LOCALE}" != "yes" ]]; then
  echo "ERROR: Frontend bundle verification failed." >&2
  exit 1
fi

if [[ "${DB_COLS}" != *write_off_destination* ]]; then
  echo "ERROR: write_off_destination column missing in DB." >&2
  exit 1
fi

echo "OK: Production deploy verified."
