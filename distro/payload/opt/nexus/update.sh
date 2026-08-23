#!/bin/sh
# NEXUS OS update channel.
# Pulls nexus-shell (and any security updates) from the configured repo and
# restarts the shell server in place when a new build lands.
set -e

CHANNEL_REPO=/etc/yum.repos.d/nexus.repo
[ -f "$CHANNEL_REPO" ] || { echo "no NEXUS update channel configured"; exit 0; }

BEFORE=$(rpm -q --qf '%{VERSION}-%{RELEASE}' nexus-shell 2>/dev/null || echo none)

dnf -y --refresh upgrade nexus-shell || {
  echo "nexus-shell upgrade failed (offline?)"; exit 0; }

# Security-only updates for the base system; never a full distro bump.
dnf -y --security upgrade || true

AFTER=$(rpm -q --qf '%{VERSION}-%{RELEASE}' nexus-shell 2>/dev/null || echo none)

if [ "$BEFORE" != "$AFTER" ]; then
  echo "nexus-shell $BEFORE -> $AFTER; restarting shell"
  systemctl restart nexus-server.service
  systemctl restart nexus-session.service
else
  echo "nexus-shell already current ($AFTER)"
fi
