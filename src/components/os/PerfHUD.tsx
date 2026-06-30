import { useEffect, useRef, useState } from "react";

interface PerfMem {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

export function PerfHUD() {
  const [fps, setFps] = useState(0);
  const [ms, setMs] = useState(0);
  const [mem, setMem] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let acc = 0;
    let prev = last;
    const tick = (t: number) => {
      const delta = t - prev;
      prev = t;
      acc += delta;
      frames++;
      if (t - last >= 500) {
        setFps(Math.round((frames * 1000) / (t - last)));
        setMs(+(acc / frames).toFixed(1));
        const m = (performance as Performance & { memory?: PerfMem }).memory;
        if (m) setMem(m.usedJSHeapSize / 1048576);
        frames = 0;
        acc = 0;
        last = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const color = fps >= 55 ? "text-emerald-400" : fps >= 30 ? "text-amber-400" : "text-red-400";

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[9998] flex gap-2 rounded-md border border-glass-border bg-black/60 px-2.5 py-1.5 font-mono text-[11px] text-white backdrop-blur">
      <span className={color}>{fps} FPS</span>
      <span className="text-white/60">·</span>
      <span>{ms.toFixed(1)}ms</span>
      {mem != null && (
        <>
          <span className="text-white/60">·</span>
          <span>{mem.toFixed(0)} MB</span>
        </>
      )}
    </div>
  );
}
