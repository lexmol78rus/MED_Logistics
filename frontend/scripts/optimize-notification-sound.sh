#!/usr/bin/env bash
# Оптимизация MP3 для колокольчика: моно, нормализация громкости, обрезка тишины.
# Использование:
#   bash frontend/scripts/optimize-notification-sound.sh /path/to/fantastic-siren.mp3

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${1:-$ROOT/tools/fantastic-siren.mp3}"
OUT_DIR="$ROOT/frontend/public/sounds"
OUT="$OUT_DIR/notification-alert.mp3"
MAX_SEC="${NOTIFICATION_SOUND_MAX_SEC:-6}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Нужен ffmpeg: sudo apt install -y ffmpeg" >&2
  exit 1
fi

if [[ ! -f "$SRC" ]]; then
  echo "Файл не найден: $SRC" >&2
  echo "Скопируйте fantastic-siren.mp3 в tools/fantastic-siren.mp3 или передайте путь аргументом." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

ffmpeg -hide_banner -loglevel warning -y -i "$SRC" \
  -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,loudnorm=I=-12:TP=-0.5:LRA=7" \
  -ac 1 -ar 44100 -b:a 128k -t "$MAX_SEC" \
  "$OUT"

ls -lh "$OUT"
echo "Готово: $OUT"
