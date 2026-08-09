# NEXUS OS — Linux distro / bootable ISO

NEXUS is a web-based desktop shell. To make it a real, bootable operating system we
do what ChromeOS / webOS / Tizen do: keep a Linux kernel + userland underneath, and
run NEXUS as the **only** graphical session (kiosk), full screen, with no browser chrome.

```
┌─────────────────────────────────────┐
│  NEXUS shell (this React app)       │  ← session
├─────────────────────────────────────┤
│  Chromium --kiosk (Wayland/cage)    │  ← renderer
├─────────────────────────────────────┤
│  Debian 12 base + systemd + Mesa    │  ← userland
├─────────────────────────────────────┤
│  Linux kernel                       │  ← real kernel, real drivers
└─────────────────────────────────────┘
```

The ISO is a live image: boots from USB/VM, autologs into `nexus`, starts the
local NEXUS server on `127.0.0.1:8080`, and launches the kiosk renderer.

## Build it

Requires a Debian/Ubuntu host (or Docker) with root:

```bash
sudo apt install live-build
bun run build            # produce the app bundle first
sudo distro/build-iso.sh # ~10-20 min, outputs distro/out/nexus-os-amd64.iso
```

Test without hardware:

```bash
qemu-system-x86_64 -m 4096 -enable-kvm -cdrom distro/out/nexus-os-amd64.iso
```

Or write to USB: `sudo dd if=nexus-os-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync`

## What's included

- `build-iso.sh` — live-build orchestration, produces a hybrid BIOS+UEFI ISO
- `config/package-lists/nexus.list.chroot` — package set (kernel, Mesa, cage, Chromium, Node)
- `config/hooks/normal/9000-nexus.hook.chroot` — creates the `nexus` user, autologin, enables services
- `config/includes.chroot/opt/nexus/` — the app bundle + tiny static server
- `config/includes.chroot/etc/systemd/system/` — `nexus-server.service`, `nexus-session.service`

## Notes / limits

- Server functions that need cloud APIs (AI assistant, web proxy, search) require
  network; offline the shell still boots thanks to the service worker cache.
- The bundled server serves the **client** build with SPA fallback. If you want the
  full server-function runtime on-device, swap `server.mjs` for a Node build of the
  TanStack server output and point the systemd unit at it.
- Installer (persistent install to disk) is not included yet — add `calamares` to the
  package list and a branding module for a full installable distro.
