#!/bin/sh
# Switch the NEXUS update channel: stable | beta | edge
#   nexus-channel            -> show current version and channel
#   sudo nexus-channel beta  -> switch channel and refresh APT metadata
set -e
RELEASE=/usr/share/nexus/release
SOURCES=/etc/apt/sources.list.d/nexus.sources
KEYRING=/usr/share/keyrings/nexus-archive-keyring.gpg
BASE_URL="${NEXUS_UPDATE_BASE:-https://updates.nexusos.africa}"

if [ -z "${1:-}" ]; then
  echo "version: $(sed -n 's/^NEXUS_VERSION=//p' "$RELEASE" 2>/dev/null || echo unknown)"
  echo "channel: $(sed -n 's/^NEXUS_CHANNEL=//p' "$RELEASE" 2>/dev/null || echo stable)"
  exit 0
fi

case "$1" in
  stable|beta|edge) CH="$1" ;;
  *) echo "usage: nexus-channel [stable|beta|edge]" >&2; exit 1 ;;
esac

if [ -f "$KEYRING" ]; then
  SIGNED_BY="Signed-By: $KEYRING"
else
  # Unsigned repo — APT will trust it only if we mark it as such.
  SIGNED_BY="Trusted: yes"
fi

cat > "$SOURCES" <<REPOEOF
Types: deb
URIs: $BASE_URL/$CH/
Suites: $CH
Components: main
Architectures: amd64
$SIGNED_BY
REPOEOF

sed -i "s/^NEXUS_CHANNEL=.*/NEXUS_CHANNEL=$CH/" "$RELEASE"
apt-get -q update || true
echo "NEXUS update channel set to $CH"
