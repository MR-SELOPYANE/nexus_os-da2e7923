#!/usr/bin/env bash
# Write the NEXUS ISO to a USB stick WITH a casper-rw persistence partition, so
# installed packages, files and settings survive reboots on the live stick.
#   sudo distro/mkpersistent.sh /dev/sdX [persistence-size-mb]
#
# Layout (GPT):
#   p1  FAT32 "NEXUS_BOOT"  — the ISO tree (UEFI-bootable; grub-mkrescue's EFI
#                             binary is standalone and boots from any FAT volume)
#   p2  ext4  "casper-rw"   — Ubuntu casper picks this up automatically as the
#                             persistent overlay for / and /etc
set -euo pipefail
DEV="${1:-}"; PERSIZE="${2:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISO="${ISO:-$HERE/out/nexus-os-ubuntu-24.04-x86_64.iso}"

[ -n "$DEV" ] || { echo "usage: sudo $0 /dev/sdX [persistence-mb]" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run as root." >&2; exit 1; }
[ -b "$DEV" ] || { echo "ERROR: $DEV is not a block device." >&2; exit 1; }
[ -f "$ISO" ] || { echo "ERROR: ISO not found at $ISO (run build-iso.sh first)." >&2; exit 1; }
for bin in sgdisk mkfs.vfat mkfs.ext4; do
  command -v "$bin" >/dev/null || {
    echo "ERROR: missing $bin. Install: apt-get install gdisk dosfstools e2fsprogs" >&2; exit 1; }
done

lsblk -o NAME,SIZE,MODEL,MOUNTPOINT "$DEV"
read -r -p "This ERASES $DEV. Type YES to continue: " ok
[ "$ok" = "YES" ] || exit 1

umount "${DEV}"* 2>/dev/null || true
wipefs -a "$DEV"

# ISO size + headroom -> boot partition size
ISO_MB=$(( ($(stat -c%s "$ISO") / 1024 / 1024) + 64 ))
sgdisk -o "$DEV"
sgdisk -n "1:0:+${ISO_MB}M" -t 1:ef00 -c 1:NEXUS_BOOT "$DEV"
if [ -n "$PERSIZE" ]; then
  sgdisk -n "2:0:+${PERSIZE}M" -t 2:8300 -c 2:casper-rw "$DEV"
else
  sgdisk -n "2:0:0" -t 2:8300 -c 2:casper-rw "$DEV"
fi
sgdisk --attributes=1:set:2 "$DEV"   # legacy BIOS boot flag on p1, best effort
partprobe "$DEV" 2>/dev/null || true
sleep 1

mkfs.vfat -F32 -n NEXUS_BOOT "${DEV}1"
mkfs.ext4 -F -L casper-rw "${DEV}2"

MNT=$(mktemp -d)
mount -o loop "$ISO" "$MNT"
mkdir -p /mnt/nexus-usb
mount "${DEV}1" /mnt/nexus-usb
cp -a "$MNT"/. /mnt/nexus-usb/
umount "$MNT"
umount /mnt/nexus-usb
rmdir "$MNT" /mnt/nexus-usb

sync
echo ">> Persistent NEXUS USB ready on $DEV (p2 ext4 casper-rw — grows as you use it)."
echo ">> Boot it UEFI. Everything saved on the system lands in the casper-rw partition."
