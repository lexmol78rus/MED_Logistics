#!/usr/bin/env bash
# Rebuild frontend assets and Docker web image (clears Vite/dist cache).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

echo "==> Clearing Vite cache and dist"
rm -rf dist node_modules/.vite

echo "==> Local production build (optional sanity check)"
if command -v node >/dev/null 2>&1 && [[ -f node_modules/vite/bin/vite.js ]]; then
  node ./node_modules/vite/bin/vite.js build
fi

cd "$ROOT"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env}"

echo "==> Docker rebuild web (--no-cache)"
sg docker -c "docker compose -f \"$COMPOSE_FILE\" --env-file \"$ENV_FILE\" build --no-cache web"

echo "==> Recreate web container"
sg docker -c "docker compose -f \"$COMPOSE_FILE\" --env-file \"$ENV_FILE\" up -d --force-recreate web"

echo "==> Done. Hard-reload browser (Ctrl+Shift+R) or use incognito."
