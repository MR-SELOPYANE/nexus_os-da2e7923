// Client bridge to the real Linux device API exposed by /opt/nexus/server.mjs.
//
// On the booted NEXUS ISO these calls hit real /proc, real systemd, real
// NetworkManager/UPower/PipeWire, real dnf and real /home/nexus. In a browser
// (preview or published web build) the probe fails and every NEXUS subsystem
// stays on its built-in simulation.

import { useEffect, useState } from "react";

export interface NativeCapabilities {
  fs: boolean;
  processes: boolean;
  services: boolean;
  battery: boolean;
  brightness: boolean;
  volume: boolean;
  wifi: boolean;
  bluetooth: boolean;
  apps: boolean;
  packages: boolean;
  pam: boolean;
}

export interface NativeSystemInfo {
  available: boolean;
  host?: string;
  kernel?: string;
  user?: string;
  home?: string;
  fsRoot?: string;
  os?: string;
  capabilities?: NativeCapabilities;
  reason?: string;
}

export interface HostEntry {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  modified: number;
  mode: number;
  hidden: boolean;
}

export interface SysStat {
  host: string;
  kernel: string;
  uptime: number;
  load: number[];
  cpu: { model: string; cores: number; usage: number | null };
  memory: { total: number; available: number; used: number; swapTotal: number; swapUsed: number };
  disks: { source: string; target: string; size: number; used: number; available: number; percent: number }[];
}

export interface SysProc {
  pid: number;
  ppid: number;
  user: string;
  priority: number;
  nice: number;
  cpu: number;
  memPercent: number;
  rss: number;
  state: string;
  name: string;
  command: string;
}

export interface SysService {
  unit: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface HwStatus {
  battery: { percent: number; state: string; timeToEmpty: string | null; timeToFull: string | null } | null;
  brightness: { percent: number; device: string } | null;
  volume: { percent: number; muted: boolean } | null;
  network: { device: string; type: string; state: string; connection: string | null }[];
  bluetooth: { powered: boolean; devices: { mac: string; name: string }[] } | null;
}

export interface WifiNetwork {
  active: boolean;
  ssid: string;
  signal: number;
  security: string;
}

export interface DesktopApp {
  id: string;
  name: string;
  exec: string;
  comment: string;
  icon: string;
  categories: string[];
  terminal: boolean;
}

export interface DebPackage {
  name: string;
  version?: string;
  summary?: string;
  size?: number;
  repo?: string;
  installed?: boolean;
}

export interface RealUser {
  username: string;
  uid: number;
  fullName: string;
  home: string;
}

const UNAVAILABLE: NativeSystemInfo = { available: false, reason: "not running on a NEXUS device" };

let probe: Promise<NativeSystemInfo> | null = null;

async function req<T>(path: string, init?: RequestInit, ms = 20_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function post<T>(path: string, body: unknown, ms = 30_000): Promise<T> {
  return req<T>(
    path,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    ms,
  );
}

/** Probe once per session for the real device API. */
export function detectNativeSystem(): Promise<NativeSystemInfo> {
  if (probe) return probe;
  probe = (async () => {
    if (typeof window === "undefined") return { available: false, reason: "ssr" };
    try {
      const info = await req<NativeSystemInfo>("/nexus/system", { method: "GET" }, 2500);
      return info?.available ? info : UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  })();
  return probe;
}

/** React hook: `null` while probing, then the device info (available true/false). */
export function useNativeSystem(): NativeSystemInfo | null {
  const [info, setInfo] = useState<NativeSystemInfo | null>(null);
  useEffect(() => {
    let alive = true;
    detectNativeSystem().then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

/** Poll a native reader while the component is mounted (no-op off-device). */
export function useNativePoll<T>(
  enabled: boolean,
  loader: () => Promise<T>,
  intervalMs: number,
): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = () =>
      loader()
        .then((v) => alive && setValue(v))
        .catch(() => {});
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);
  return value;
}

// ------------------------------------------------------------- filesystem
export const hostFs = {
  list: (path: string) =>
    req<{ root: string; path: string; items: HostEntry[]; error?: string }>(
      `/nexus/fs?op=list&path=${encodeURIComponent(path)}`,
    ),
  read: (path: string) =>
    req<{ content: string; error?: string }>(`/nexus/fs?op=read&path=${encodeURIComponent(path)}`),
  write: (path: string, content: string) => post<{ ok: boolean }>("/nexus/fs?op=write", { path, content }),
  mkdir: (path: string) => post<{ ok: boolean }>("/nexus/fs?op=mkdir", { path }),
  remove: (path: string, permanent = false) =>
    post<{ ok: boolean; trashed: boolean }>("/nexus/fs?op=rm", { path, permanent }),
  rename: (path: string, to: string) => post<{ ok: boolean }>("/nexus/fs?op=rename", { path, to }),
};

// ----------------------------------------------------------- system state
export const hostSys = {
  stat: () => req<SysStat>("/nexus/sys?op=stat"),
  procs: () => req<{ procs: SysProc[] }>("/nexus/sys?op=procs", undefined, 15_000).then((r) => r.procs),
  services: () => req<{ services: SysService[] }>("/nexus/sys?op=services").then((r) => r.services),
  kill: (pid: number, signal: "TERM" | "KILL" | "STOP" | "CONT" = "TERM") =>
    post<{ ok: boolean; error?: string }>("/nexus/sys?op=kill", { pid, signal }),
  renice: (pid: number, nice: number) =>
    post<{ ok: boolean; error?: string }>("/nexus/sys?op=renice", { pid, nice }),
  service: (unit: string, action: "start" | "stop" | "restart") =>
    post<{ ok: boolean; error?: string }>("/nexus/sys?op=service", { unit, action }),
};

// --------------------------------------------------------------- hardware
export const hostHw = {
  status: () => req<HwStatus>("/nexus/hw?op=status"),
  wifi: () => req<{ networks: WifiNetwork[] }>("/nexus/hw?op=wifi", undefined, 30_000).then((r) => r.networks),
  setBrightness: (percent: number) => post<{ ok: boolean }>("/nexus/hw?op=brightness", { percent }),
  setVolume: (percent: number, muted?: boolean) => post<{ ok: boolean }>("/nexus/hw?op=volume", { percent, muted }),
  wifiConnect: (ssid: string, password?: string) =>
    post<{ ok: boolean; error?: string }>("/nexus/hw?op=wifi-connect", { ssid, password }, 60_000),
  wifiDisconnect: (device: string) => post<{ ok: boolean }>("/nexus/hw?op=wifi-disconnect", { device }),
  radio: (enabled: boolean) => post<{ ok: boolean }>("/nexus/hw?op=rfkill", { enabled }),
  bluetooth: (patch: { powered?: boolean; scan?: boolean; connect?: string; disconnect?: string }) =>
    post<{ ok: boolean }>("/nexus/hw?op=bluetooth", patch, 30_000),
};

// ------------------------------------------------------------------- apps
export const hostApps = {
  list: () => req<{ apps: DesktopApp[] }>("/nexus/apps").then((r) => r.apps),
  launch: (id: string) => post<{ started: boolean; name?: string }>("/nexus/apps?op=launch", { id }),
};

// ------------------------------------------------------------------- packages
export const hostPkg = {
  installed: () => req<{ packages: DebPackage[] }>("/nexus/pkg?op=list", undefined, 60_000).then((r) => r.packages),
  search: (q: string) =>
    req<{ packages: DebPackage[] }>(`/nexus/pkg?op=search&q=${encodeURIComponent(q)}`, undefined, 60_000).then(
      (r) => r.packages,
    ),
  updates: () =>
    req<{ packages: DebPackage[]; hasUpdates: boolean }>("/nexus/pkg?op=updates", undefined, 120_000),
  install: (name: string) => post<{ ok: boolean; log: string }>("/nexus/pkg?op=install", { name }, 15 * 60_000),
  remove: (name: string) => post<{ ok: boolean; log: string }>("/nexus/pkg?op=remove", { name }, 5 * 60_000),
  upgradeAll: () => post<{ ok: boolean; log: string }>("/nexus/pkg?op=update", {}, 30 * 60_000),
};

// ------------------------------------------------------------------- auth
export const hostAuth = {
  users: () => req<{ users: RealUser[]; pam: boolean }>("/nexus/auth"),
  verify: (username: string, password: string) =>
    post<{ valid: boolean; pam: boolean }>("/nexus/auth?op=verify", { username, password }, 15_000),
};

export const formatBytes = (n: number) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
