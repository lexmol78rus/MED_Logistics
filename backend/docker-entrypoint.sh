#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR" "$UPLOAD_DIR/ru"
chown -R node:node "$UPLOAD_DIR"

cd /app
exec su node -s /bin/sh -c "$*"
