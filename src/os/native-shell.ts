// Bridge to the real Linux shell on the device.
//
// When NEXUS runs as the desktop session of the ISO, the on-device server
// (/opt/nexus/server.mjs) exposes a loopback-only bash endpoint. In a browser
// (preview, published web build) the probe fails and the Terminal falls back
// to the built-in simulated userland.

export interface NativeInfo {
  available: boolean;
  shell?: string;
  user?: string;
  host?: string;
  home?: string;
  os?: string;
  kernel?: string;
  reason?: string;
}

export interface NativeResult {
  stdout: string;
  stderr: string;
  code: number;
  cwd: string;
  truncated?: boolean;
  timedOut?: boolean;
}

const ENDPOINT = "/nexus/exec";

let probe: Promise<NativeInfo> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Detect whether a real shell is reachable. Cached for the session. */
export function detectNativeShell(): Promise<NativeInfo> {
  if (probe) return probe;
  probe = (async (): Promise<NativeInfo> => {
    if (typeof window === "undefined") return { available: false, reason: "ssr" };
    try {
      const res = await fetchWithTimeout(ENDPOINT, { method: "GET" }, 2500);
      if (!res.ok) return { available: false, reason: `http ${res.status}` };
      const data = (await res.json()) as NativeInfo;
      return data?.available ? data : { available: false, reason: "disabled" };
    } catch (err) {
      return { available: false, reason: err instanceof Error ? err.message : "unreachable" };
    }
  })();
  return probe;
}

/** Reset the cached probe (used by `native on`). */
export function resetNativeProbe() {
  probe = null;
}

/** Run a command line in the real shell. Throws if the bridge is unavailable. */
export async function runNative(cmd: string, cwd: string): Promise<NativeResult> {
  const res = await fetchWithTimeout(
    ENDPOINT,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cmd, cwd }),
    },
    60_000,
  );
  if (!res.ok) throw new Error(`shell bridge returned ${res.status}`);
  return (await res.json()) as NativeResult;
}
