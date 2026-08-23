#!/usr/bin/env bash
# Build a bootable NEXUS OS live ISO — Fedora base, NEXUS as the only graphical session.
# Usage: sudo distro/build-iso.sh   (run on a Fedora host, or a Fedora container with --privileged)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$HERE/out"
WORK="$HERE/.work"
RELEASEVER="${RELEASEVER:-41}"
REPO_DIR="/tmp/nexus-repo"   # must match the repo path in nexus.ks

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (livemedia-creator needs it)." >&2
  exit 1
fi
for bin in livemedia-creator rpmbuild createrepo_c; do
  command -v "$bin" >/dev/null || {
    echo "ERROR: missing $bin. Install: dnf install lorax rpm-build createrepo_c" >&2; exit 1; }
done

# 1. App bundle -------------------------------------------------------------
# The ISO ships BOTH halves of the build: dist/client (static assets) and
# dist/server (SSR + server functions), served on-device by payload server.mjs.
CLIENT_DIST="$ROOT/dist/client"
SERVER_DIST="$ROOT/dist/server"
[ -d "$CLIENT_DIST" ] || { echo "ERROR: $CLIENT_DIST missing. Run 'bun run build' first." >&2; exit 1; }
[ -d "$SERVER_DIST" ] || { echo "ERROR: $SERVER_DIST missing. Run 'bun run build' first." >&2; exit 1; }
[ -f "$SERVER_DIST/index.mjs" ] || { echo "ERROR: $SERVER_DIST/index.mjs missing." >&2; exit 1; }
echo ">> using app bundle: $CLIENT_DIST + $SERVER_DIST"

# 2. Package the shell + units as an RPM -----------------------------------
rm -rf "$WORK"; mkdir -p "$WORK"/{BUILD,RPMS,SOURCES,SPECS,buildroot} "$OUT"
BR="$WORK/buildroot"
mkdir -p "$BR/opt/nexus/app/client" "$BR/opt/nexus/app/server"
cp -a "$HERE/payload/opt/nexus/." "$BR/opt/nexus/"
cp -a "$CLIENT_DIST/." "$BR/opt/nexus/app/client/"
cp -a "$SERVER_DIST/." "$BR/opt/nexus/app/server/"
mkdir -p "$BR/etc/systemd/system"
cp -a "$HERE/payload/etc/systemd/system/." "$BR/etc/systemd/system/"
chmod +x "$BR/opt/nexus/session.sh"


cat > "$WORK/SPECS/nexus-shell.spec" <<EOF
Name:           nexus-shell
Version:        1.0
Release:        1%{?dist}
Summary:        NEXUS OS desktop shell (kiosk session)
License:        MIT
BuildArch:      noarch
Requires:       nodejs, chromium, cage, seatd, curl
%description
The NEXUS OS graphical shell served locally and rendered full-screen in a kiosk browser.
%install
mkdir -p %{buildroot}
cp -a $BR/. %{buildroot}/
%files
/opt/nexus
/etc/systemd/system/nexus-server.service
/etc/systemd/system/nexus-session.service
%changelog
* Mon Aug 10 2026 NEXUS <root@nexus> - 1.0-1
- Fedora base
EOF

rpmbuild --define "_topdir $WORK" -bb "$WORK/SPECS/nexus-shell.spec"

rm -rf "$REPO_DIR"; mkdir -p "$REPO_DIR"
find "$WORK/RPMS" -name '*.rpm' -exec cp {} "$REPO_DIR/" \;
createrepo_c "$REPO_DIR"
echo ">> local repo ready: $REPO_DIR"

# 3. Build the live ISO -----------------------------------------------------
livemedia-creator \
  --make-iso \
  --ks "$HERE/nexus.ks" \
  --releasever "$RELEASEVER" \
  --iso-name "nexus-os-x86_64.iso" \
  --volid "NEXUS_OS" \
  --project "NEXUS OS" \
  --resultdir "$OUT/result" \
  --tmp "$WORK/tmp" \
  --no-virt

ISO="$(find "$OUT/result" -name '*.iso' | head -n1)"
[ -n "$ISO" ] || { echo "ERROR: livemedia-creator produced no ISO." >&2; exit 1; }
mv "$ISO" "$OUT/nexus-os-x86_64.iso"
sha256sum "$OUT/nexus-os-x86_64.iso" > "$OUT/nexus-os-x86_64.iso.sha256"

echo
echo ">> DONE: $OUT/nexus-os-x86_64.iso"
echo ">> test: qemu-system-x86_64 -m 4096 -enable-kvm -cdrom $OUT/nexus-os-x86_64.iso"
