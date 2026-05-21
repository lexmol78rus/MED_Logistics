#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:3001/api/v1}"
TS=$(date +%s)
EMAIL="pilot-pwd-${TS}@med.local"
PASS4="1234"
PASS3="123"
PASS_RESET="1111"

fail() { echo "FAIL: $*"; exit 1; }
ok() { echo "OK: $*"; }

echo "=== E2E password policy @ $BASE ==="

ADMIN_LOGIN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@med.local","password":"Warehouse123!"}') || fail 'admin login'
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Empty password on create
CODE=$(curl -s -o /tmp/pwd-e2e.json -w '%{http_code}' -X POST "$BASE/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"empty-${TS}@med.local\",\"password\":\"\",\"role\":\"VIEWER\"}")
[[ "$CODE" == "400" ]] || fail "empty password expected 400 got $CODE"
ok 'empty password rejected'

# 3-char password on create
CODE=$(curl -s -o /tmp/pwd-e2e.json -w '%{http_code}' -X POST "$BASE/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"short-${TS}@med.local\",\"password\":\"$PASS3\",\"role\":\"VIEWER\"}")
[[ "$CODE" == "400" ]] || fail "3-char password expected 400 got $CODE"
ok '3-char password rejected'

# Create user with 4-char password
CREATE=$(curl -sf -X POST "$BASE/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS4\",\"role\":\"VIEWER\",\"isActive\":true}") || fail 'create user with 1234'
USER_ID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
ok "user created $EMAIL"

# Login with 4-char password
LOGIN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS4\"}") || fail 'login with 1234'
echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('accessToken')" || fail 'no accessToken'
ok 'login with 1234'

# Admin reset password to 1111
curl -sf -X POST "$BASE/users/$USER_ID/reset-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASS_RESET\"}" >/dev/null || fail 'reset password to 1111'
ok 'reset password to 1111'

# Login with new password
curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS_RESET\"}" >/dev/null || fail 'login after reset with 1111'
ok 'login after reset with 1111'

echo "=== ALL E2E CHECKS PASSED ==="
