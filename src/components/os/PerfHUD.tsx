import { useRealMetrics } from "@/os/real-metrics";

/** Live frame/CPU/memory readout: /proc on a NEXUS device, real browser timings otherwise. */
export function PerfHUD() {
  const m = useRealMetrics(2000);
  const color = m.fps >= 55 ? "text-emerald-400" : m.fps >= 30 ? "text-amber-400" : "text-red-400";

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[9998] flex gap-2 rounded-md border border-glass-border bg-black/60 px-2.5 py-1.5 font-mono text-[11px] text-white backdrop-blur">
      <span className={color}>{m.fps} FPS</span>
      <span className="text-white/60">·</span>
      <span>{m.frameMs.toFixed(1)}ms</span>
      {m.cpu != null && (
        <>
          <span className="text-white/60">·</span>
          <span>CPU {m.cpu.toFixed(0)}%</span>
        </>
      )}
      {m.memUsedMB != null && (
        <>
          <span className="text-white/60">·</span>
          <span>{m.memUsedMB.toFixed(0)} MB</span>
        </>
      )}
      <span className="text-white/40">{m.source === "device" ? "/proc" : "browser"}</span>
    </div>
  );
}
