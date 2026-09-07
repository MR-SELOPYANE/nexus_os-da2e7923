#!/usr/bin/env bash
# Build an OFFLINE install mirror: every RPM the ISO needs plus the NEXUS
# channel, so schools and clinics can install and update with no internet.
#   distro/mkmirror.sh [outdir]        -> outdir/nexus-mirror (+ .tar.zst)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/out}/nexus-mirror"
RELEASEVER="${RELEASEVER:-41}"
CHANNEL="${NEXUS_CHANNEL:-stable}"

for bin in dnf createrepo_c; do
  command -v "$bin" >/dev/null || { echo "ERROR: missing $bin" >&2; exit 1; }
done

mkdir -p "$OUT/packages"
mapfile -t PKGS < <(grep -vE '^\s*(#|%|-|@|$)' "$HERE/nexus.ks" | sed -n '/^%packages/,/^%end/p' 2>/dev/null || true)
# fall back to the package block parsed directly from the kickstart
if [ "${#PKGS[@]}" -eq 0 ]; then
  mapfile -t PKGS < <(awk '/^%packages/{f=1;next}/^%end/{f=0}f' "$HERE/nexus.ks" | grep -vE '^\s*(#|-|@|$)')
fi

echo ">> mirroring ${#PKGS[@]} packages + dependencies (Fedora $RELEASEVER)"
dnf download --resolve --alldeps --releasever="$RELEASEVER" \
  --destdir "$OUT/packages" "${PKGS[@]}"

# Include the locally built NEXUS shell RPM if present
find "$HERE/.work/RPMS" -name 'nexus-shell*.rpm' -exec cp {} "$OUT/packages/" \; 2>/dev/null || true

createrepo_c "$OUT/packages"

cat > "$OUT/nexus-offline.repo" <<REPO
[nexus-offline]
name=NEXUS Offline Mirror ($CHANNEL)
baseurl=file:///run/media/\$USER/NEXUS_MIRROR/packages
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-nexus
REPO

cat > "$OUT/README.txt" <<'TXT'
NEXUS offline mirror
--------------------
1. Copy this folder to a USB stick labelled NEXUS_MIRROR.
2. On the target machine: sudo cp nexus-offline.repo /etc/yum.repos.d/
3. Install or update with no internet: sudo dnf --disablerepo='*' --enablerepo=nexus-offline update
TXT

tar --zstd -cf "$OUT.tar.zst" -C "$(dirname "$OUT")" "$(basename "$OUT")"
echo ">> offline mirror: $OUT (archive: $OUT.tar.zst)"
