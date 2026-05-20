#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env"
EXAMPLE="${ROOT_DIR}/deploy/.env.example"

if [[ -f "${ENV_FILE}" ]]; then
  echo "deploy/.env already exists — skipping."
  exit 0
fi

cp "${EXAMPLE}" "${ENV_FILE}"
echo "Created deploy/.env from deploy/.env.example"
echo "Edit deploy/.env with production secrets before deploying."
