#!/usr/bin/env bash
# Build an OFFLINE APT mirror: every .deb the ISO needs plus the NEXUS shell
# package, so schools and clinics can install and update with no internet.
# Run on an Ubuntu 24.04 host (it resolves packages against your apt sources).
#   distro/mkmirror.sh [outdir]        -> outdir/nexus-mirror (+ .tar.zst)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/out}/nexus-mirror"
SUITE="${UBUNTU_SUITE:-noble}"
CHANNEL="${NEXUS_CHANNEL:-stable}"

for bin in apt-get apt-cache dpkg-scanpackages apt-ftparchive; do
  command -v "$bin" >/dev/null || { echo "ERROR: missing $bin (apt-get install apt-utils dpkg-dev)" >&2; exit 1; }
done

# Package list is kept in one place: a marker line in ubuntu-setup.sh.
PKGS=$(sed -n 's/^# MIRROR-PKGS: //p' "$HERE/ubuntu-setup.sh")
[ -n "$PKGS" ] || { echo "ERROR: no '# MIRROR-PKGS:' line found in ubuntu-setup.sh" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/pool/main" "$OUT/dists/$SUITE/main/binary-amd64"

# Download the packages and all their recursive dependencies.
DEPS=$(apt-cache depends --recurse \
  --no-recommends --no-suggests --no-conflicts --no-breaks --no-replaces --no-enhances \
  $PKGS | grep -E '^\w' | sort -u)
echo ">> downloading ${#DEPS} packages + dependencies ($SUITE)"
(cd "$OUT/pool/main" && apt-get download $DEPS)

# Include the locally built NEXUS shell .deb if present
find "$HERE/.work" -maxdepth 1 -name 'nexus-shell*.deb' -exec cp {} "$OUT/pool/main/" \; 2>/dev/null || true

# APT repository metadata: Packages index + signed Release/InRelease
cd "$OUT"
dpkg-scanpackages --arch amd64 pool /dev/null > "dists/$SUITE/main/binary-amd64/Packages"
gzip -k9 "dists/$SUITE/main/binary-amd64/Packages"

{
  echo "Origin: NEXUS OS"
  echo "Label: NEXUS OS Offline Mirror ($CHANNEL)"
  echo "Suite: $SUITE"
  echo "Codename: $SUITE"
  echo "Architectures: amd64"
  echo "Components: main"
  echo "Date: $(date -Ru)"
  apt-ftparchive release dists/"$SUITE"
} > "dists/$SUITE/Release"

cat > "$OUT/nexus-offline.sources" <<REPO
## NEXUS offline mirror — copy to /etc/apt/sources.list.d/nexus-offline.sources
## with this folder on a USB stick labelled NEXUS_MIRROR.
deb [trusted=yes] file:///media/\$USER/NEXUS_MIRROR $SUITE main
REPO

if [ -n "${NEXUS_GPG_KEY_ID:-}" ]; then
  gpg --clearsign --digest-algo SHA256 -o "dists/$SUITE/InRelease" "dists/$SUITE/Release"
  gpg --detach-sign --armor --digest-algo SHA256 -o "dists/$SUITE/Release.gpg" "dists/$SUITE/Release"
  gpg --armor --export "$NEXUS_GPG_KEY_ID" > "$OUT/nexus-archive-keyring.asc"
fi

cat > "$OUT/README.txt" <<'TXT'
NEXUS offline mirror
--------------------
1. Copy this folder to a USB stick labelled NEXUS_MIRROR.
2. On the target machine:
     sudo cp nexus-offline.sources /etc/apt/sources.list.d/
     sudo cp nexus-archive-keyring.asc /usr/share/keyrings/   (if present)
3. Install or update with no internet:
     sudo apt-get update
     sudo apt-get upgrade -t $SUITE
TXT

tar --zstd -cf "$OUT.tar.zst" -C "$(dirname "$OUT")" "$(basename "$OUT")"
echo ">> offline mirror: $OUT (archive: $OUT.tar.zst)"
