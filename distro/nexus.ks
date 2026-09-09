### NEXUS OS — Fedora-based live kickstart
# Built with livemedia-creator (lorax). See build-iso.sh.

lang en_ZA.UTF-8
keyboard us
timezone Africa/Johannesburg --utc
auth --useshadow --passalgo=sha512
selinux --enforcing
firewall --enabled --service=mdns
rootpw --lock
xconfig --startxonboot
zerombr
clearpart --all
part / --size 8192 --fstype ext4
services --enabled=NetworkManager,nexus-server,nexus-session,seatd,nexus-update.timer
shutdown

# Fedora mirrors + the local repo holding the nexus-shell RPM built by build-iso.sh
repo --name=fedora --mirrorlist=https://mirrors.fedoraproject.org/metalink?repo=fedora-$releasever&arch=$basearch
repo --name=updates --mirrorlist=https://mirrors.fedoraproject.org/metalink?repo=updates-released-f$releasever&arch=$basearch
repo --name=nexus-local --baseurl=file:///tmp/nexus-repo

%packages --excludedocs
@core
kernel
dracut-live
systemd-udev
NetworkManager
pipewire
pipewire-pulseaudio
wireplumber
mesa-dri-drivers
mesa-vulkan-drivers
seatd
cage
chromium
nodejs
google-noto-color-emoji-fonts
rsms-inter-fonts
plymouth
plymouth-system-theme
curl
ca-certificates
xdg-utils
sudo
anaconda
anaconda-live
anaconda-widgets
nexus-shell
-@dial-up
-@input-methods
-gnome-shell
-plasma-workspace
%end

%post
set -e

# Dedicated unprivileged session user
useradd -m -s /bin/bash nexus || true
passwd -d nexus || true
for g in video render audio input seat; do getent group "$g" >/dev/null && usermod -aG "$g" nexus; done

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

# The kiosk user may launch exactly one privileged command: the disk installer.
cat > /etc/sudoers.d/nexus-install <<'EOF'
nexus ALL=(root) NOPASSWD: /opt/nexus/install.sh
EOF
chmod 0440 /etc/sudoers.d/nexus-install
ln -sf /opt/nexus/install.sh /usr/bin/nexus-install

# Branded boot splash (silent, no kernel spew)
plymouth-set-default-theme nexus || true
if [ -f /etc/default/grub ]; then
  sed -i 's/rhgb quiet//; s/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 rhgb quiet splash"/' /etc/default/grub
fi
dracut --force --regenerate-all || true

# Branded Anaconda installer
mkdir -p /etc/anaconda/product.d
cat > /etc/anaconda/product.d/nexus.conf <<'EOF'
[Product]
product_name = NEXUS OS

[Base Product]
product_name = Fedora

[User Interface]
custom_stylesheet = /usr/share/anaconda/pixmaps/nexus.css
EOF
cat > /usr/share/anaconda/pixmaps/nexus.css <<'EOF'
.logo-sidebar { background-image: url('/usr/share/anaconda/pixmaps/sidebar-bg.png'); background-color: #080d18; background-repeat: no-repeat; }
.logo { background-image: url('/usr/share/anaconda/pixmaps/sidebar-logo.png'); }
EOF

systemctl enable nexus-server.service nexus-session.service
systemctl enable nexus-update.timer || true
systemctl enable seatd.service || true
systemctl set-default graphical.target

# Chromium in kiosk needs to talk to the compositor without a login manager
cat > /etc/sysctl.d/99-nexus.conf <<'EOF'
vm.swappiness=10
EOF

# Branding
cat > /etc/os-release <<'EOF'
NAME="NEXUS OS"
PRETTY_NAME="NEXUS OS (African Edition)"
ID=nexus
ID_LIKE="fedora rhel"
VERSION_ID="1.1.0"
VERSION="1.1.0 (Karoo)"
VARIANT="Live"
HOME_URL="https://lovable.dev/"
EOF
ln -sf /etc/os-release /usr/lib/os-release
echo "NEXUS OS" > /etc/issue.net
%end
