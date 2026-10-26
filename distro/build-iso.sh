#!/usr/bin/env bash
# Build a bootable NEXUS OS live ISO — Ubuntu 24.04 LTS (Noble) base, NEXUS as
# the only graphical session.
#
# Pipeline: debootstrap a minimal noble rootfs -> chroot-install the base set +
# the nexus-shell .deb -> mksquashfs -> grub-mkrescue (hybrid BIOS+UEFI ISO).
#
# Usage: sudo distro/build-iso.sh   (run on an Ubuntu 24.04 host or container, as root)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$HERE/out"
WORK="$HERE/.work"
UBUNTU_SUITE="${UBUNTU_SUITE:-noble}"                    # 24.04 LTS
UBUNTU_MIRROR="${UBUNTU_MIRROR:-http://archive.ubuntu.com/ubuntu}"
ISO_NAME="${ISO_NAME:-nexus-os-ubuntu-24.04-x86_64.iso}"
NEXUS_VERSION="${NEXUS_VERSION:-1.2.0}"
NEXUS_CHANNEL="${NEXUS_CHANNEL:-stable}"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (debootstrap needs it)." >&2
  exit 1
fi
for bin in debootstrap mksquashfs grub-mkrescue dpkg-deb curl gpg; do
  command -v "$bin" >/dev/null || {
    echo "ERROR: missing $bin. Install:
      apt-get install debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin mtools dpkg-dev gnupg curl ca-certificates" >&2
    exit 1
  }
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

# 2. Package the shell + units as a .deb ------------------------------------
rm -rf "$WORK"
mkdir -p "$OUT"
DEB="$WORK/deb"
BR="$DEB/opt/nexus"
mkdir -p "$BR/app/client" "$BR/app/server" \
         "$DEB/etc/systemd/system" "$DEB/etc/apt/sources.list.d" \
         "$DEB/usr/share/nexus" "$DEB/usr/share/plymouth/themes" \
         "$DEB/etc/sudoers.d" "$DEB/etc/calamares"
cp -a "$HERE/payload/opt/nexus/." "$BR/"
cp -a "$CLIENT_DIST/." "$BR/app/client/"
cp -a "$SERVER_DIST/." "$BR/app/server/"
cp -a "$HERE/payload/usr/share/plymouth/themes/." "$DEB/usr/share/plymouth/themes/"
cp -a "$HERE/payload/usr/share/nexus/." "$DEB/usr/share/nexus/"
cp -a "$HERE/payload/etc/systemd/system/." "$DEB/etc/systemd/system/"
cp -a "$HERE/payload/etc/apt/." "$DEB/etc/apt/"
cp -a "$HERE/payload/etc/calamares/." "$DEB/etc/calamares/"
chmod +x "$BR"/*.sh

sed -i "s/^NEXUS_VERSION=.*/NEXUS_VERSION=$NEXUS_VERSION/;s/^NEXUS_CHANNEL=.*/NEXUS_CHANNEL=$NEXUS_CHANNEL/;s/^NEXUS_BASE=.*/NEXUS_BASE=ubuntu-24.04/" \
  "$DEB/usr/share/nexus/release"

INSTALLED_SIZE=$(du -sk "$DEB" | cut -f1)
cat > "$DEB/DEBIAN/control" <<EOF
Package: nexus-shell
Version: $NEXUS_VERSION-1
Section: utils
Priority: optional
Architecture: all
Installed-Size: $INSTALLED_SIZE
Depends: nodejs | nodejs-20, chromium-browser | chromium | epiphany-browser, cage, seatd, curl, sudo, plymouth, init-system-helpers
Recommends: unattended-upgrades
Maintainer: NEXUS CI <ci@nexusos.africa>
Description: NEXUS OS desktop shell (kiosk session)
 The NEXUS graphical shell, served locally on 127.0.0.1:8080 and rendered
 full-screen in a kiosk browser under the cage Wayland compositor.
EOF

dpkg-deb --build --root-owner-group "$DEB" "$WORK/nexus-shell_${NEXUS_VERSION}-1_all.deb"
DEB_PATH="$WORK/nexus-shell_${NEXUS_VERSION}-1_all.deb"
echo ">> built $DEB_PATH"

# 3. Bootstrap the Ubuntu rootfs --------------------------------------------
ROOTFS="$WORK/rootfs"
debootstrap --arch=amd64 --variant=minbase "$UBUNTU_SUITE" "$ROOTFS" "$UBUNTU_MIRROR"

mount -t proc proc "$ROOTFS/proc"
mount --bind /dev "$ROOTFS/dev"
mount --bind /dev/pts "$ROOTFS/dev/pts"
mount --bind /sys "$ROOTFS/sys"
cleanup() {
  umount -l "$ROOTFS/dev/pts" "$ROOTFS/dev" "$ROOTFS/sys" "$ROOTFS/proc" 2>/dev/null || true
}
trap cleanup EXIT

cp "$DEB_PATH" "$ROOTFS/root/nexus-shell.deb"
cp "$HERE/ubuntu-setup.sh" "$ROOTFS/root/ubuntu-setup.sh"
echo ">> configuring rootfs (chroot)"
chroot "$ROOTFS" /bin/bash -c "/root/ubuntu-setup.sh /root/nexus-shell.deb"
rm -f "$ROOTFS/root/ubuntu-setup.sh" "$ROOTFS/root/nexus-shell.deb"
cleanup
trap - EXIT

# 4. Assemble the ISO tree ---------------------------------------------------
ISODIR="$WORK/iso"
rm -rf "$ISODIR"
mkdir -p "$ISODIR/casper" "$ISODIR/.disk" "$ISODIR/boot/grub"

# record the manifest + size BEFORE trimming the tree
chroot "$ROOTFS" dpkg-query -W -f='${Package} ${Version}\n' > "$ISODIR/casper/filesystem.manifest"
du -s -B1 "$ROOTFS" | cut -f1 > "$ISODIR/casper/filesystem.size"

mksquashfs "$ROOTFS" "$ISODIR/casper/filesystem.squashfs" \
  -noappend -no-recovery -comp zstd -Xcompression-level 19 -e boot

cp "$ROOTFS"/boot/vmlinuz-* "$ISODIR/casper/vmlinuz"
cp "$ROOTFS"/boot/initrd.img-* "$ISODIR/casper/initrd"
echo "NEXUS OS $NEXUS_VERSION - Live $UBUNTU_SUITE amd64 $(date -u +%Y%m%d)" > "$ISODIR/.disk/info"

cat > "$ISODIR/boot/grub/grub.cfg" <<'EOF'
set timeout=5
set default=0
insmod all_video
insmod gfxterm
terminal_output gfxterm

menuentry "NEXUS OS" {
  linux /casper/vmlinuz boot=casper quiet splash ---
  initrd /casper/initrd
}
menuentry "NEXUS OS (safe graphics)" {
  linux /casper/vmlinuz boot=casper nomodeset quiet splash ---
  initrd /casper/initrd
}
menuentry "Boot from next volume" {
  exit 1
}
EOF

# 5. Hybrid BIOS + UEFI ISO --------------------------------------------------
grub-mkrescue -o "$OUT/$ISO_NAME" "$ISODIR" -- -volid NEXUS_OS
sha256sum "$OUT/$ISO_NAME" > "$OUT/$ISO_NAME.sha256"

echo
echo ">> DONE: $OUT/$ISO_NAME"
echo ">> persistent USB: sudo distro/mkpersistent.sh /dev/sdX"
echo ">> secure boot:    distro/sign-secureboot.sh generate && sudo distro/sign-secureboot.sh sign <isoroot>"
echo ">> offline mirror: distro/mkmirror.sh"
echo ">> test: qemu-system-x86_64 -m 4096 -enable-kvm -cdrom $OUT/$ISO_NAME"
