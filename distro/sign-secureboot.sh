#!/usr/bin/env bash
# Sign the NEXUS shim/GRUB/kernel chain with a Machine Owner Key so the ISO
# boots on hardware with Secure Boot enabled (user enrols the MOK once at first boot).
#   distro/sign-secureboot.sh generate            # create MOK.key / MOK.crt / MOK.cer
#   sudo distro/sign-secureboot.sh sign <isoroot> # sign EFI binaries + kernel in an extracted ISO tree
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYDIR="${NEXUS_MOK_DIR:-$HERE/keys}"
CMD="${1:-help}"

need() { command -v "$1" >/dev/null || { echo "ERROR: missing $1 (apt-get install $2)" >&2; exit 1; }; }

case "$CMD" in
generate)
  mkdir -p "$KEYDIR"; chmod 700 "$KEYDIR"
  [ -f "$KEYDIR/MOK.key" ] && { echo "keys already exist in $KEYDIR"; exit 0; }
  openssl req -new -x509 -newkey rsa:2048 -nodes -days 3650 \
    -subj "/CN=NEXUS OS Secure Boot/" \
    -keyout "$KEYDIR/MOK.key" -out "$KEYDIR/MOK.crt"
  openssl x509 -in "$KEYDIR/MOK.crt" -outform DER -out "$KEYDIR/MOK.cer"
  chmod 600 "$KEYDIR/MOK.key"
  echo ">> MOK generated in $KEYDIR. Enrol MOK.cer at first boot via mokutil."
  ;;
sign)
  ISOROOT="${2:-}"
  [ -d "$ISOROOT" ] || { echo "usage: $0 sign <extracted-iso-root>" >&2; exit 1; }
  need sbsign sbsigntool
  [ -f "$KEYDIR/MOK.key" ] || { echo "ERROR: run '$0 generate' first." >&2; exit 1; }
  # Sign every EFI binary and the kernel shipped on the media.
  while IFS= read -r -d '' f; do
    echo ">> signing $f"
    sbsign --key "$KEYDIR/MOK.key" --cert "$KEYDIR/MOK.crt" --output "$f" "$f"
  done < <(find "$ISOROOT" \( -name '*.efi' -o -name 'vmlinuz*' \) -type f -print0)
  # Ship the public cert so the user can enrol it.
  cp "$KEYDIR/MOK.cer" "$ISOROOT/MOK.cer"
  echo ">> signed. At first boot choose 'Enroll MOK' -> import MOK.cer -> reboot."
  ;;
*)
  sed -n '2,6p' "$0"; exit 1;;
esac
