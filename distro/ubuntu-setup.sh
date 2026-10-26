#!/usr/bin/env bash
# NEXUS OS rootfs setup — run INSIDE the Ubuntu 24.04 chroot during build-iso.sh.
# This replaces the old Fedora kickstart (nexus.ks): the same package set and
# the same %post steps, expressed in apt + dpkg instead of dnf + rpm.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
DEB="${1:?usage: ubuntu-setup.sh /path/to/nexus-shell.deb}"
SUITE="${UBUNTU_SUITE:-noble}"
MIRROR="${UBUNTU_MIRROR:-http://archive.ubuntu.com/ubuntu}"

# MIRROR-PKGS: systemd linux-generic casper networkmanager seatd cage chromium-browser epiphany-browser plymouth plymouth-themes pipewire pipewire-pulse wireplumber libgl1-mesa-dri mesa-vulkan-drivers fonts-noto-color-emoji fonts-inter curl ca-certificates xdg-utils sudo polkitd upower brightnessctl bluez unattended-upgrades

# --- full Ubuntu package set: main + universe (cage and calamares are universe)
NEXUS_SOURCES=/etc/apt/sources.list.d/nexus.sources
if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then
  sed -i 's/^Components:.*/Components: main universe restricted multiverse/' /etc/apt/sources.list.d/ubuntu.sources
else
  cat > /etc/apt/sources.list <<EOF
deb $MIRROR $SUITE main universe restricted multiverse
deb $MIRROR $SUITE-updates main universe restricted multiverse
deb http://security.ubuntu.com/ubuntu $SUITE-security main universe restricted multiverse
EOF
fi
apt-get update -q

# Base system. The first attempt is strict; anything genuinely optional is retried below.
apt-get install -y --no-install-recommends \
  systemd linux-generic casper networkmanager seatd cage \
  chromium-browser plymouth plymouth-themes \
  pipewire pipewire-pulse wireplumber \
  libgl1-mesa-dri mesa-vulkan-drivers \
  fonts-noto-color-emoji fonts-inter \
  curl ca-certificates xdg-utils sudo polkitd \
  upower brightnessctl bluez unattended-upgrades

# Offline-friendly fallback browser (chromium-browser on Ubuntu is a snap
# transitional package; a deb browser keeps a no-network live session usable).
apt-get install -y --no-install-recommends epiphany-browser || true
# Calamares drives the disk installer (`nexus-install`). Optional: a live-only
# build is still fully usable without it.
apt-get install -y --no-install-recommends calamares || true
# PAM password checks for the sign-in screen (may be absent in this suite).
apt-get install -y --no-install-recommends pamtester || true

# Node 20+ for the NEXUS server (noble ships Node 18, too old for the SSR bundle).
if ! node --version 2>/dev/null | grep -qE '^v2[0-9]'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs || true
fi

# --- dedicated unprivileged session user
useradd -m -s /bin/bash nexus || true
passwd -d nexus || true
for g in video render audio input seat; do
  getent group "$g" >/dev/null && usermod -aG "$g" nexus || true
done

# Autologin on tty1; nexus-session takes over the display
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin nexus --noclear %I $TERM
EOF

chown -R nexus:nexus /opt/nexus
chmod +x /opt/nexus/session.sh /opt/nexus/install.sh /opt/nexus/update.sh /opt/nexus/channel.sh
ln -sf /opt/nexus/channel.sh /usr/bin/nexus-channel
ln -sf /opt/nexus/install.sh /usr/bin/nexus-install

# The kiosk user may launch exactly one privileged command: the disk installer.
cat > /etc/sudoers.d/nexus-install <<'EOF'
nexus ALL=(root) NOPASSWD: /opt/nexus/install.sh
EOF
chmod 0440 /etc/sudoers.d/nexus-install

# NEXUS shell +, if shipped, the signing key for the update channel
dpkg -i "$DEB" || apt-get -f install -y
if [ -f /usr/share/nexus/RPM-GPG-KEY-nexus ]; then
  gpg --dearmor < /usr/share/nexus/RPM-GPG-KEY-nexus > /usr/share/keyrings/nexus-archive-keyring.gpg || true
fi
rm -f "$NEXUS_SOURCES"   # channel.sh writes it on first `nexus-channel <name>`

# Branded boot splash (silent, no kernel spew)
plymouth-set-default-theme nexus || true

# Calamares is preconfigured with NEXUS branding (shipped by nexus-shell).

# Branding
cat > /etc/os-release <<'EOF'
NAME="NEXUS OS"
PRETTY_NAME="NEXUS OS (African Edition)"
ID=nexus
ID_LIKE="ubuntu debian"
VERSION_ID="1.2.0"
VERSION="1.2.0 (Karoo)"
VARIANT="Live"
HOME_URL="https://lovable.dev/"
EOF
chmod 644 /etc/os-release
cp /etc/os-release /usr/lib/os-release
echo "NEXUS OS" > /etc/issue.net

cat > /etc/sysctl.d/99-nexus.conf <<'EOF'
vm.swappiness=10
EOF

systemctl enable nexus-server.service nexus-session.service
systemctl enable nexus-update.timer || true
systemctl enable seatd.service || true
systemctl enable NetworkManager.service || true
systemctl set-default graphical.target

# clean up so the squashfs stays small
apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
