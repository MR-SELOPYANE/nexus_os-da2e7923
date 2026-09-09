#!/bin/sh
# Switch the NEXUS update channel: stable | beta | edge
#   sudo nexus-channel            -> show current channel
#   sudo nexus-channel beta       -> switch and refresh metadata
set -e
RELEASE=/usr/share/nexus/release
REPO=/etc/yum.repos.d/nexus.repo
BASE_URL="${NEXUS_UPDATE_BASE:-https://updates.nexusos.africa}"

current() { sed -n 's/^NEXUS_CHANNEL=//p' "$RELEASE" 2>/dev/null || echo stable; }

if [ -z "${1:-}" ]; then
  echo "version: $(sed -n 's/^NEXUS_VERSION=//p' $RELEASE)"
  echo "channel: $(current)"
  exit 0
fi

case "$1" in
  stable|beta|edge) CH="$1" ;;
  *) echo "usage: nexus-channel [stable|beta|edge]" >&2; exit 1 ;;
esac

cat > "$REPO" <<REPOEOF
[nexus]
name=NEXUS OS ($CH) \$releasever - \$basearch
baseurl=$BASE_URL/$CH/f\$releasever/\$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-nexus
metadata_expire=6h
skip_if_unavailable=1
REPOEOF

sed -i "s/^NEXUS_CHANNEL=.*/NEXUS_CHANNEL=$CH/" "$RELEASE"
dnf -q --refresh makecache --repo=nexus || true
echo "NEXUS update channel set to $CH"
