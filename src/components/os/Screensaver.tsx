import { useEffect, useRef, useState } from "react";

/**
 * Screensaver overlay — a drifting starfield with a large fading clock.
 * Dismissed on any pointer move, key press, or click.
 */
export function Screensaver({ onDismiss }: { onDismiss: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Starfield animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 1 + 0.2,
      r: Math.random() * 1.6 + 0.3,
    }));
    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const s of stars) {
        s.x += s.z * 0.25;
        if (s.x > w) s.x = 0;
        ctx.globalAlpha = 0.3 + s.z * 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onMouseMove={onDismiss}
      onClick={onDismiss}
      onKeyDown={onDismiss}
      tabIndex={-1}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="relative select-none text-center">
        <div className="text-7xl font-extralight tracking-tight text-white/90 tabular-nums sm:text-8xl">
          {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="mt-2 text-sm font-light text-white/40">
          {clock.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="mt-6 text-[11px] uppercase tracking-[0.3em] text-white/25">
          Move to unlock
        </div>
      </div>
    </div>
  );
}
