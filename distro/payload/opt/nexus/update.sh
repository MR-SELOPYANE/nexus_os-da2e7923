#!/bin/sh
# NEXUS OS update channel (APT).
# Refreshes metadata, upgrades nexus-shell (and security-only base updates),
# and restarts the shell services in place when a new build lands.
set -e

SOURCES=/etc/apt/sources.list.d/nexus.sources
[ -f "$SOURCES" ] || { echo "no NEXUS update channel configured"; exit 0; }

export DEBIAN_FRONTEND=noninteractive
BEFORE=$(dpkg-query -W -f='${Version}' nexus-shell 2>/dev/null || echo none)

apt-get update -q || { echo "apt update failed (offline?)"; exit 0; }
apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold \
  install --only-upgrade nexus-shell || { echo "nexus-shell upgrade failed"; exit 0; }

# Security-only updates for the base system; never a full distro bump.
if command -v unattended-upgrade >/dev/null; then
  unattended-upgrade || true
else
  apt-get -y -q upgrade || true
fi

AFTER=$(dpkg-query -W -f='${Version}' nexus-shell 2>/dev/null || echo none)

if [ "$BEFORE" != "$AFTER" ]; then
  echo "nexus-shell $BEFORE -> $AFTER; restarting shell"
  systemctl restart nexus-server.service
  systemctl restart nexus-session.service
else
  echo "nexus-shell already current ($AFTER)"
fi
