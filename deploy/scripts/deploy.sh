#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/deploy/.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  bash "${ROOT_DIR}/deploy/scripts/setup-env.sh"
fi

echo "Building and starting production stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

echo
echo "Production stack started."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
