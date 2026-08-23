#!/bin/sh
# Launch the NEXUS OS disk installer (Anaconda's live installer) in its own
# full-screen Wayland compositor, on top of the running kiosk session.
# Triggered by `nexus-install` from a TTY or by POST /nexus/install on the
# local shell server.
set -e

if [ ! -x /usr/bin/liveinst ] && [ ! -x /usr/sbin/liveinst ]; then
  echo "liveinst not present — this build is live-only." >&2
  exit 1
fi

LIVEINST=$(command -v liveinst)

# Anaconda needs root; the nexus user is granted exactly this one command.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -n /opt/nexus/install.sh
fi

export ANACONDA_PRODUCTNAME="NEXUS OS"
export ANACONDA_PRODUCTVERSION="1.0"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/0}"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

exec cage -d -- "$LIVEINST"
