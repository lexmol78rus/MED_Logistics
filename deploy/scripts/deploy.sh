#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/deploy/.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  bash "${ROOT_DIR}/deploy/scripts/setup-env.sh"
fi

echo "Use deploy-production-full.sh for code changes (clean dist, no-cache, migrate, verify)."
echo "Quick start (no clean rebuild):"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

echo
echo "Production stack started."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
echo
echo "After frontend/backend changes run:"
echo "  bash deploy/scripts/deploy-production-full.sh"
