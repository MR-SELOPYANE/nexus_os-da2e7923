#!/usr/bin/env bash
# Build a bootable NEXUS OS live ISO (Debian 12 base + kiosk NEXUS session).
# Usage: sudo distro/build-iso.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$HERE/out"
WORK="$HERE/.work"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (live-build needs chroot)." >&2
  exit 1
fi
command -v lb >/dev/null || { echo "ERROR: install live-build (apt install live-build)." >&2; exit 1; }

# 1. App bundle -------------------------------------------------------------
APP_DIST=""
for candidate in "$ROOT/dist/client" "$ROOT/.output/public" "$ROOT/dist"; do
  [ -d "$candidate" ] && APP_DIST="$candidate" && break
done
[ -n "$APP_DIST" ] || { echo "ERROR: no build output found. Run 'bun run build' first." >&2; exit 1; }
echo ">> using app bundle: $APP_DIST"

rm -rf "$HERE/config/includes.chroot/opt/nexus/app"
mkdir -p "$HERE/config/includes.chroot/opt/nexus/app"
cp -a "$APP_DIST/." "$HERE/config/includes.chroot/opt/nexus/app/"

# 2. live-build workspace ---------------------------------------------------
rm -rf "$WORK"; mkdir -p "$WORK" "$OUT"
cp -a "$HERE/config" "$WORK/config"
cd "$WORK"

lb config \
  --distribution bookworm \
  --architectures amd64 \
  --archive-areas "main contrib non-free non-free-firmware" \
  --binary-images iso-hybrid \
  --bootappend-live "boot=live components quiet splash noeject hostname=nexus username=nexus" \
  --debian-installer none \
  --iso-application "NEXUS OS" \
  --iso-publisher "NEXUS" \
  --iso-volume "NEXUS_OS" \
  --memtest none

chmod +x config/hooks/normal/*.hook.chroot || true

# 3. Build ------------------------------------------------------------------
lb build

ISO="$(ls -1 live-image-amd64.hybrid.iso 2>/dev/null || true)"
[ -n "$ISO" ] || { echo "ERROR: live-build produced no ISO." >&2; exit 1; }
mv "$ISO" "$OUT/nexus-os-amd64.iso"
sha256sum "$OUT/nexus-os-amd64.iso" > "$OUT/nexus-os-amd64.iso.sha256"

echo
echo ">> DONE: $OUT/nexus-os-amd64.iso"
echo ">> test: qemu-system-x86_64 -m 4096 -enable-kvm -cdrom $OUT/nexus-os-amd64.iso"
