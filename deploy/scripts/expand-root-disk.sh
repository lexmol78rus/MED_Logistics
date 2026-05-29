#!/usr/bin/env bash
# Расширение корневого тома / после увеличения диска в VMware (ESXi).
# Запуск: sudo bash deploy/scripts/expand-root-disk.sh
set -euo pipefail

LV_PATH="/dev/ubuntu-vg/ubuntu-lv"
PARTITION="/dev/sda3"
DISK="/dev/sda"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Запустите с sudo: sudo bash $0" >&2
  exit 1
fi

echo "=== До ==="
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT "${DISK}"
df -h /
vgs ubuntu-vg
lvs ubuntu-vg/ubuntu-lv

echo
echo "=== 1. Пересканировать диск ==="
echo 1 > "/sys/class/block/$(basename "${DISK}")/device/rescan"
sleep 2

DISK_SIZE="$(lsblk -dn -o SIZE "${DISK}" | tr -d ' ')"
echo "Размер ${DISK}: ${DISK_SIZE}"

echo
echo "=== 2. Расширить раздел ${PARTITION} ==="
growpart "${DISK}" 3

echo
echo "=== 3. Расширить LVM ==="
pvresize "${PARTITION}"
lvextend -l +100%FREE "${LV_PATH}"

echo
echo "=== 4. Расширить ext4 на / ==="
resize2fs "${LV_PATH}"

echo
echo "=== После ==="
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT "${DISK}"
df -h /
vgs ubuntu-vg
lvs ubuntu-vg/ubuntu-lv

echo
echo "Готово."
