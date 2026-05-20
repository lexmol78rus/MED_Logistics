#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env"
EXAMPLE="${ROOT_DIR}/deploy/.env.example"

if [[ -f "${ENV_FILE}" ]]; then
  echo "deploy/.env already exists — skipping."
  exit 0
fi

echo "For production, use: deploy/scripts/generate-prod-env.sh"
echo "For a manual template, copy deploy/.env.example to deploy/.env"
cp "${EXAMPLE}" "${ENV_FILE}"
echo "Created deploy/.env from deploy/.env.example (placeholder secrets)."
echo "Run generate-prod-env.sh or replace secrets before deploying."
