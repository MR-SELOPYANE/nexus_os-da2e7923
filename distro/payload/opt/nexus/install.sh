#!/bin/sh
# Launch the NEXUS OS disk installer (Calamares) in its own full-screen Wayland
# compositor, on top of the running kiosk session.
# Triggered by `nexus-install` from a TTY or by POST /nexus/install on the
# local shell server.
set -e

if ! command -v calamares >/dev/null; then
  echo "calamares not present — this build is live-only." >&2
  exit 1
fi

# Calamares needs root; the nexus user is granted exactly this one command.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -n /opt/nexus/install.sh
fi

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/0}"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

exec cage -d -- calamares
