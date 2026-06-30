import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Minus, Square, Copy } from "lucide-react";
import { useOS, type WindowState, type SnapZone } from "@/os/store";
import { APP_MAP } from "@/os/apps";
import { cn } from "@/lib/utils";

interface WindowFrameProps {
  win: WindowState;
  children: ReactNode;
}

const MIN_W = 280;
const MIN_H = 200;
const TASKBAR_H = 64;

export function WindowFrame({ win, children }: WindowFrameProps) {
  const focusWindow = useOS((s) => s.focusWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const moveWindow = useOS((s) => s.moveWindow);
  const resizeWindow = useOS((s) => s.resizeWindow);
  const snapWindow = useOS((s) => s.snapWindow);

  const meta = APP_MAP[win.appId];
  const Icon = meta.icon;

  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{
    dir: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [active, setActive] = useState(false);
  const [snapHint, setSnapHint] = useState<SnapZone | null>(null);

  useEffect(() => {
    function detectSnap(x: number, y: number): SnapZone | null {
      const EDGE = 12;
      const sw = window.innerWidth;
      const sh = window.innerHeight - TASKBAR_H;
      const nearTop = y <= EDGE;
      const nearLeft = x <= EDGE;
      const nearRight = x >= sw - EDGE;
      const nearBottom = y >= sh - EDGE;
      if (nearTop && nearLeft) return "tl";
      if (nearTop && nearRight) return "tr";
      if (nearBottom && nearLeft) return "bl";
      if (nearBottom && nearRight) return "br";
      if (nearTop) return "top";
      if (nearLeft) return "left";
      if (nearRight) return "right";
      return null;
    }
    function onMove(e: PointerEvent) {
      if (drag.current) {
        const x = e.clientX - drag.current.dx;
        const y = Math.max(0, e.clientY - drag.current.dy);
        moveWindow(win.id, x, y);
        setSnapHint(detectSnap(e.clientX, e.clientY));
      } else if (resize.current) {
        const r = resize.current;
        let { x, y, w, h } = r;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        if (r.dir.includes("e")) w = Math.max(MIN_W, r.w + dx);
        if (r.dir.includes("s")) h = Math.max(MIN_H, r.h + dy);
        if (r.dir.includes("w")) {
          w = Math.max(MIN_W, r.w - dx);
          x = r.x + (r.w - w);
        }
        if (r.dir.includes("n")) {
          h = Math.max(MIN_H, r.h - dy);
          y = r.y + (r.h - h);
        }
        resizeWindow(win.id, w, h, x, y);
      }
    }
    function onUp() {
      if (drag.current && snapHint) {
        snapWindow(win.id, snapHint, {
          w: window.innerWidth,
          h: window.innerHeight - TASKBAR_H,
        });
      }
      drag.current = null;
      resize.current = null;
      setActive(false);
      setSnapHint(null);
    }
    if (active) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active, moveWindow, resizeWindow, snapHint, snapWindow, win.id]);

  if (win.minimized) return null;

  const startDrag = (e: React.PointerEvent) => {
    if (win.maximized) return;
    focusWindow(win.id);
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    setActive(true);
  };

  const startResize = (e: React.PointerEvent, dir: string) => {
    if (win.maximized) return;
    e.stopPropagation();
    focusWindow(win.id);
    resize.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      x: win.x,
      y: win.y,
      w: win.width,
      h: win.height,
    };
    setActive(true);
  };

  const handleMaximize = () =>
    toggleMaximize(win.id, {
      w: window.innerWidth,
      h: window.innerHeight - TASKBAR_H,
    });

  const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  const cursorFor: Record<string, string> = {
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    nw: "nwse-resize",
    se: "nwse-resize",
  };

  const snapStyle = (z: SnapZone | null): React.CSSProperties => {
    if (!z) return { display: "none" };
    const sw = window.innerWidth;
    const sh = window.innerHeight - TASKBAR_H;
    const h2 = Math.floor(sh / 2);
    const w2 = Math.floor(sw / 2);
    const map: Record<SnapZone, React.CSSProperties> = {
      left: { left: 0, top: 0, width: w2, height: sh },
      right: { left: w2, top: 0, width: sw - w2, height: sh },
      top: { left: 0, top: 0, width: sw, height: sh },
      tl: { left: 0, top: 0, width: w2, height: h2 },
      tr: { left: w2, top: 0, width: sw - w2, height: h2 },
      bl: { left: 0, top: h2, width: w2, height: sh - h2 },
      br: { left: w2, top: h2, width: sw - w2, height: sh - h2 },
    };
    return map[z];
  };

  return (
    <>
      {snapHint && (
        <div
          className="pointer-events-none absolute z-[8000] rounded-lg border-2 border-primary bg-primary/15 backdrop-blur-sm transition-all duration-150"
          style={snapStyle(snapHint)}
        />
      )}
    <div
      data-window
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl glass-strong text-window-foreground shadow-[var(--shadow-window)] animate-window-in",
        win.maximized && "rounded-none"
      )}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onPointerDown={() => focusWindow(win.id)}
    >
      {/* Title bar */}
      <div
        className="flex h-10 shrink-0 items-center gap-2 border-b border-glass-border bg-white/5 px-3"
        onPointerDown={startDrag}
        onDoubleClick={handleMaximize}
      >
        <Icon className="size-4 text-primary" />
        <span className="flex-1 truncate text-sm font-medium">{win.title}</span>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Minimize"
            onClick={() => minimizeWindow(win.id)}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            aria-label="Maximize"
            onClick={handleMaximize}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            {win.maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
          </button>
          <button
            aria-label="Close"
            onClick={() => closeWindow(win.id)}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">{children}</div>

      {/* Resize handles */}
      {!win.maximized &&
        handles.map((dir) => (
          <div
            key={dir}
            onPointerDown={(e) => startResize(e, dir)}
            style={{ cursor: cursorFor[dir] }}
            className={cn(
              "absolute z-10",
              dir === "n" && "left-2 right-2 top-0 h-1.5",
              dir === "s" && "left-2 right-2 bottom-0 h-1.5",
              dir === "e" && "top-2 bottom-2 right-0 w-1.5",
              dir === "w" && "top-2 bottom-2 left-0 w-1.5",
              dir === "ne" && "right-0 top-0 size-3",
              dir === "nw" && "left-0 top-0 size-3",
              dir === "se" && "right-0 bottom-0 size-3",
              dir === "sw" && "left-0 bottom-0 size-3"
            )}
          />
        ))}
    </div>
    </>
  );
}
