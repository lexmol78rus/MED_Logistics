#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
ENV_FILE="${ROOT_DIR}/deploy/.env"

if [[ -f "${ENV_FILE}" ]]; then
  ENV_ARGS=(--env-file "${ENV_FILE}")
else
  ENV_ARGS=()
fi

echo "=== Docker Compose config validation: ${COMPOSE_FILE} ==="
docker compose -f "${COMPOSE_FILE}" "${ENV_ARGS[@]}" config --quiet
echo "OK: compose file is valid"

echo
echo "=== Service status ==="
docker compose -f "${COMPOSE_FILE}" "${ENV_ARGS[@]}" ps 2>/dev/null || echo "(stack not running)"

if curl -sf http://127.0.0.1/health >/dev/null 2>&1; then
  echo "OK: nginx /health"
else
  echo "SKIP: nginx /health (stack may not be running)"
fi

if curl -sf http://127.0.0.1:3000/api/v1/health/live >/dev/null 2>&1; then
  echo "OK: API /api/v1/health/live"
else
  echo "SKIP: API health (stack may not be running)"
fi
