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

## Install to disk

The live image ships Anaconda (`anaconda` + `anaconda-live`). From the running
system you can start a persistent install in three ways:

- run `nexus-install` from a TTY (symlink to `/opt/nexus/install.sh`)
- `POST http://127.0.0.1:8080/nexus/install` from the shell (loopback only)
- `sudo /opt/nexus/install.sh`

The `nexus` user has a single sudoers exception (`/etc/sudoers.d/nexus-install`)
allowing exactly that script — nothing else. The installer runs in its own Cage
compositor on top of the kiosk, branded as "NEXUS OS 1.0".

## Update channel

`nexus-update.timer` runs `/opt/nexus/update.sh` 10 minutes after boot and daily
after that. It upgrades the `nexus-shell` RPM from the channel repo, applies
security-only updates for the base system, and restarts the shell services only
when the shell version actually changed.

To enable it, publish `nexus-shell` RPMs with `createrepo_c` and copy
`/etc/yum.repos.d/nexus.repo.example` to `/etc/yum.repos.d/nexus.repo` with
`baseurl` pointed at that repo. Without that file the timer exits cleanly.

## Real Linux terminal

On the booted ISO the NEXUS Terminal is a front-end for a **real** shell, not a
simulation. `/opt/nexus/server.mjs` exposes a loopback-only bridge:

- `GET /nexus/exec` — capability probe (shell, user, host, `$HOME`, distro, kernel)
- `POST /nexus/exec` `{ cmd, cwd }` — runs the line in `bash -l -c`, returns
  `{ stdout, stderr, code, cwd }`

Commands run as the unprivileged `nexus` user, so `ls`, `dnf`, `systemctl`,
`journalctl`, pipes, redirection and scripts all behave exactly as they do on
any Fedora box. `cd` persists because the bridge reports `$PWD` back to the
Terminal; shell variables and background jobs do not survive between lines
(each line is its own login shell).

In a plain browser (preview or the hosted web build) the probe fails and the
Terminal transparently falls back to the built-in simulated userland. Switch
manually with `native on` / `native off`; `native` alone prints the mode.

Tuning via the service environment: `NEXUS_EXEC=off` disables the bridge,
`NEXUS_SHELL` picks a different shell, `NEXUS_EXEC_TIMEOUT` (ms) and
`NEXUS_EXEC_MAXBYTES` cap runaway commands.

## Notes / limits

- The on-device server (`/opt/nexus/server.mjs`) runs the **full** build — SSR plus
  server functions — by adapting the bundle's fetch handler to Node's http server.
  Verified against a real `bun run build` output (`dist/client` + `dist/server`).
- Server functions that call cloud APIs (AI assistant, web proxy, search) still need
  network; offline the shell boots fine thanks to the service worker cache.
- Requires Node 20+ on the image (Fedora 41 ships Node 22) for `Request`/`Response`
  and `Readable.toWeb`.
- SELinux stays enforcing; the kiosk runs as the unprivileged `nexus` user under `cage`.

