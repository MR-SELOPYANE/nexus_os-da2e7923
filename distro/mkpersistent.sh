#!/usr/bin/env bash
# Write the NEXUS ISO to a USB stick WITH a persistent overlay, so installed
# packages, files and settings survive reboots on the live stick.
#   sudo distro/mkpersistent.sh /dev/sdX [overlay-size-mb] [home-size-mb]
set -euo pipefail
DEV="${1:-}"; OVERLAY="${2:-4096}"; HOMESIZE="${3:-4096}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISO="${ISO:-$HERE/out/nexus-os-x86_64.iso}"

[ -n "$DEV" ] || { echo "usage: sudo $0 /dev/sdX [overlay-mb] [home-mb]" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run as root." >&2; exit 1; }
[ -b "$DEV" ] || { echo "ERROR: $DEV is not a block device." >&2; exit 1; }
[ -f "$ISO" ] || { echo "ERROR: ISO not found at $ISO (run build-iso.sh first)." >&2; exit 1; }
command -v livecd-iso-to-disk >/dev/null || {
  echo "ERROR: missing livecd-iso-to-disk. Install: dnf install livecd-tools" >&2; exit 1; }

lsblk -o NAME,SIZE,MODEL,MOUNTPOINT "$DEV"
read -r -p "This ERASES $DEV. Type YES to continue: " ok
[ "$ok" = "YES" ] || exit 1

umount "${DEV}"* 2>/dev/null || true

livecd-iso-to-disk \
  --format --reset-mbr --efi \
  --overlay-size-mb "$OVERLAY" \
  --home-size-mb "$HOMESIZE" \
  --unencrypted-home \
  --label NEXUS_OS \
  "$ISO" "$DEV"

sync
echo ">> Persistent NEXUS USB ready on $DEV (${OVERLAY}MB overlay, ${HOMESIZE}MB /home)."
