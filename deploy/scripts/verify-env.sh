#!/usr/bin/env bash
# Static production environment verification — does not start containers or print secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
NGINX_DEFAULT="${ROOT_DIR}/deploy/nginx/default.conf"
NGINX_PROD="${ROOT_DIR}/deploy/nginx/default.prod.conf"

PASS=0
FAIL=0
WARN=0

ok() { echo "OK: $*"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
warn() { echo "WARN: $*"; WARN=$((WARN + 1)); }

# Read a key from deploy/.env without sourcing (avoids shell injection)
env_get() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' || true
}

# True if value is empty or matches known weak placeholders
is_weak() {
  local v="$1"
  [[ -z "${v}" ]] && return 0
  case "${v}" in
    change-me*|development-only*|postgres|password|secret|test|admin|123456*)
      return 0
      ;;
  esac
  return 1
}

check_min_len() {
  local name="$1" min="$2"
  local v
  v="$(env_get "${name}")"
  if is_weak "${v}"; then
    fail "${name} is missing or uses a placeholder/weak value"
    return
  fi
  if [[ "${#v}" -lt "${min}" ]]; then
    fail "${name} length ${#v} < required ${min}"
    return
  fi
  ok "${name} set (${#v} chars, value redacted)"
}

echo "=== Production environment verification ==="
echo "Root: ${ROOT_DIR}"
echo

if [[ ! -f "${ENV_FILE}" ]]; then
  fail "deploy/.env not found — run deploy/scripts/generate-prod-env.sh"
  echo
  echo "Summary: ${PASS} passed, ${FAIL} failed, ${WARN} warnings"
  exit 1
fi

if [[ "$(stat -c '%a' "${ENV_FILE}" 2>/dev/null || stat -f '%OLp' "${ENV_FILE}")" != "600" ]]; then
  warn "deploy/.env permissions are not 600 (recommended)"
else
  ok "deploy/.env permissions 600"
fi

# Required secrets and settings
for key in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB NODE_ENV API_PREFIX \
  JWT_ACCESS_SECRET JWT_REFRESH_SECRET VITE_API_URL VITE_APP_ENV APP_URL; do
  v="$(env_get "${key}")"
  if [[ -z "${v}" && "${key}" != "GEMINI_API_KEY" ]]; then
    fail "${key} is unset"
  fi
done

check_min_len POSTGRES_PASSWORD 32
check_min_len JWT_ACCESS_SECRET 32
check_min_len JWT_REFRESH_SECRET 32

node_env="$(env_get NODE_ENV)"
[[ "${node_env}" == "production" ]] && ok "NODE_ENV=production" || fail "NODE_ENV must be production (got: ${node_env})"

api_prefix="$(env_get API_PREFIX)"
[[ "${api_prefix}" == "api/v1" ]] && ok "API_PREFIX=api/v1" || warn "API_PREFIX is '${api_prefix}' (expected api/v1 for default nginx routing)"

vite_url="$(env_get VITE_API_URL)"
[[ "${vite_url}" == /api/v1 || "${vite_url}" == */api/v1 ]] && ok "VITE_API_URL suitable for nginx same-origin proxy" \
  || warn "VITE_API_URL='${vite_url}' — use /api/v1 when frontend and API share the nginx host"

vite_env="$(env_get VITE_APP_ENV)"
[[ "${vite_env}" == "production" ]] && ok "VITE_APP_ENV=production" || fail "VITE_APP_ENV must be production"

echo
echo "=== Docker Compose env loading ==="
if command -v docker >/dev/null 2>&1; then
  if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" config --quiet 2>/dev/null; then
    ok "docker compose config validates with deploy/.env"
  else
    fail "docker compose config failed — check deploy/.env and docker-compose.prod.yml"
  fi

  # Confirm required substitution keys resolve (names only, no values)
  rendered="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" config 2>/dev/null || true)"
  for svc_key in \
    "med_warehouse_db_prod:POSTGRES_PASSWORD" \
    "med_warehouse_api_prod:JWT_ACCESS_SECRET" \
    "med_warehouse_api_prod:JWT_REFRESH_SECRET" \
    "med_warehouse_api_prod:DATABASE_URL"; do
    cname="${svc_key%%:*}"
    var="${svc_key##*:}"
    if echo "${rendered}" | grep -A200 "container_name: ${cname}" | grep -q "${var}:"; then
      if echo "${rendered}" | grep -A200 "container_name: ${cname}" | grep "${var}:" | grep -qE '\$\{|change-me|Set POSTGRES|Set JWT'; then
        fail "compose ${cname} ${var} not fully substituted"
      else
        ok "compose maps ${var} for ${cname}"
      fi
    else
      fail "compose missing ${var} for ${cname}"
    fi
  done
else
  warn "docker not available — skipped compose config validation"
fi

echo
echo "=== Nginx proxy paths ==="
for f in "${NGINX_DEFAULT}" "${NGINX_PROD}"; do
  if [[ -f "${f}" ]]; then
    if grep -q 'location /api/' "${f}" && grep -q 'proxy_pass http://med_warehouse_api' "${f}"; then
      ok "$(basename "${f}"): /api/ -> api upstream"
    else
      fail "$(basename "${f}"): missing /api/ proxy to med_warehouse_api"
    fi
    if grep -q 'upstream med_warehouse_api' "${f}" && grep -q 'server api:3000' "${f}"; then
      ok "$(basename "${f}"): upstream api:3000"
    else
      fail "$(basename "${f}"): upstream api:3000 not configured"
    fi
  fi
done

echo
echo "=== Backend / frontend env wiring (static) ==="
if grep -q 'JWT_ACCESS_SECRET: \${JWT_ACCESS_SECRET' "${COMPOSE_FILE}" && \
   grep -q 'DATABASE_URL: postgresql://' "${COMPOSE_FILE}" && \
   grep -q 'NODE_ENV: production' "${COMPOSE_FILE}"; then
  ok "docker-compose.prod.yml injects backend production env"
else
  fail "docker-compose.prod.yml backend env incomplete"
fi

if grep -q 'VITE_API_URL' "${COMPOSE_FILE}" && grep -q 'VITE_API_URL' "${ROOT_DIR}/frontend/Dockerfile"; then
  ok "VITE_API_URL passed into frontend production build"
else
  fail "VITE_API_URL not wired in compose/Dockerfile"
fi

if grep -q 'import.meta.env.VITE_API_URL' "${ROOT_DIR}/frontend/src" 2>/dev/null || \
   grep -rq 'VITE_API_URL' "${ROOT_DIR}/frontend/" --include='*.ts' --include='*.tsx' 2>/dev/null; then
  ok "frontend references VITE_API_URL"
else
  warn "frontend source has no VITE_API_URL reference yet (env still set for build)"
fi

echo
echo "=== Summary ==="
echo "Passed: ${PASS}  Failed: ${FAIL}  Warnings: ${WARN}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
