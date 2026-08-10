# NEXUS OS — Fedora-based Linux distro / bootable ISO

NEXUS is a web-based desktop shell. To make it a real, bootable operating system we
do what ChromeOS / webOS / Tizen do: keep a Linux kernel + userland underneath, and
run NEXUS as the **only** graphical session (kiosk), full screen, with no browser chrome.

```
┌─────────────────────────────────────┐
│  NEXUS shell (this React app)       │  ← session
├─────────────────────────────────────┤
│  Chromium --kiosk (Wayland/cage)    │  ← renderer
├─────────────────────────────────────┤
│  Fedora 41 base + systemd + Mesa    │  ← userland
├─────────────────────────────────────┤
│  Linux kernel                       │  ← real kernel, real drivers
└─────────────────────────────────────┘
```

The ISO is a live image: boots from USB/VM, autologs into `nexus`, starts the
local NEXUS server on `127.0.0.1:8080`, and launches the kiosk renderer.

## Build it

Requires a **Fedora host** (or `fedora:41` container run `--privileged`) with root:

```bash
sudo dnf install lorax rpm-build createrepo_c
bun run build            # produce the app bundle first
sudo distro/build-iso.sh # ~15-30 min, outputs distro/out/nexus-os-x86_64.iso
```

Override the Fedora release with `RELEASEVER=42 sudo distro/build-iso.sh`.

Test without hardware:

```bash
qemu-system-x86_64 -m 4096 -enable-kvm -cdrom distro/out/nexus-os-x86_64.iso
```

Or write to USB: `sudo dd if=nexus-os-x86_64.iso of=/dev/sdX bs=4M status=progress oflag=sync`

## What's included

- `build-iso.sh` — packages the shell as a `nexus-shell` RPM into a local repo, then
  drives `livemedia-creator` to produce a hybrid BIOS+UEFI live ISO
- `nexus.ks` — the kickstart: package set, `%post` (nexus user, tty1 autologin,
  service enablement, branding)
- `payload/opt/nexus/` — tiny static server + kiosk session launcher (the app bundle
  is copied in at build time)
- `payload/etc/systemd/system/` — `nexus-server.service`, `nexus-session.service`

## Notes / limits

- Server functions that need cloud APIs (AI assistant, web proxy, search) require
  network; offline the shell still boots thanks to the service worker cache.
- SELinux stays enforcing; the kiosk runs as the unprivileged `nexus` user under `cage`.
- The bundled server serves the **client** build with SPA fallback. For the full
  server-function runtime on-device, swap `server.mjs` for a Node build of the
  TanStack server output and repoint the systemd unit.
- Installer (persistent install to disk) is not included yet — add `anaconda` +
  `anaconda-live` to the package list and a branding module for a fully installable distro.
