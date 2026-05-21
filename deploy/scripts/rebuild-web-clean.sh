#!/bin/bash
# Force a clean frontend rebuild and redeploy (no stale Docker/Vite assets).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/.env.example to deploy/.env first." >&2
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

echo "Stopping stack..."
dc down

echo "Cleaning docker cache..."
docker_prune

echo "Removing old frontend dist..."
rm -rf frontend/dist frontend/.env.build

echo "Rebuilding api + web (no cache)..."
dc build --no-cache api web

echo "Starting stack..."
dc up -d

echo "Applying migrations..."
dc exec -T api npx prisma migrate deploy

echo "Done."
echo "Verify: curl -s http://127.0.0.1/version.json"
echo "         curl -s http://127.0.0.1/ | grep -o '/assets/index-[^\"]*\\.js'"
