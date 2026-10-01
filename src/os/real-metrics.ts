/**
 * Real CPU/memory metrics for the shell.
 * On a NEXUS device we read /proc through the host bridge; in a browser we
 * measure what the browser actually exposes (frame budget + JS heap) instead of
 * inventing numbers.
 */
import { useEffect, useRef, useState } from "react";
import { hostSys, useNativeSystem, type SysStat } from "@/os/native-system";

export interface RealMetrics {
  /** 0-100, null when the platform does not report it. */
  cpu: number | null;
  /** Used memory in MB, null when unknown. */
  memUsedMB: number | null;
  /** Total memory in MB, null when unknown. */
  memTotalMB: number | null;
  fps: number;
  frameMs: number;
  source: "device" | "browser";
  stat: SysStat | null;
}

/** Live metrics sampled from the device (native) or the browser runtime. */
export function useRealMetrics(intervalMs = 2000): RealMetrics {
  const native = useNativeSystem();
  const isNative = !!native?.available && !!native.capabilities?.processes;
  const [stat, setStat] = useState<SysStat | null>(null);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [heap, setHeap] = useState<{ used: number; limit: number } | null>(null);
  const raf = useRef<number | null>(null);

  // Native /proc sampling.
  useEffect(() => {
    if (!isNative) return;
    let alive = true;
    const tick = () =>
      hostSys
        .stat()
        .then((s) => alive && setStat(s))
        .catch(() => {});
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isNative, intervalMs]);

  // Browser frame-budget + heap sampling (also useful on device).
  useEffect(() => {
    let frames = 0;
    let acc = 0;
    let last = performance.now();
    let prev = last;
    const tick = (t: number) => {
      acc += t - prev;
      prev = t;
      frames++;
      if (t - last >= 500) {
        setFps(Math.round((frames * 1000) / (t - last)));
        setFrameMs(+(acc / frames).toFixed(1));
        const m = (performance as Performance & {
          memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }).memory;
        if (m) setHeap({ used: m.usedJSHeapSize / 1048576, limit: m.jsHeapSizeLimit / 1048576 });
        frames = 0;
        acc = 0;
        last = t;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  if (isNative && stat) {
    return {
      cpu: stat.cpu.usage,
      memUsedMB: stat.memory.used / 1048576,
      memTotalMB: stat.memory.total / 1048576,
      fps,
      frameMs,
      source: "device",
      stat,
    };
  }

  // Browser: express render cost against a 60fps budget — a measured value, not a guess.
  const cpu = frameMs > 0 ? Math.min(100, Math.round((frameMs / 16.67) * 100)) : null;
  return {
    cpu,
    memUsedMB: heap ? heap.used : null,
    memTotalMB: heap ? heap.limit : null,
    fps,
    frameMs,
    source: "browser",
    stat: null,
  };
}
