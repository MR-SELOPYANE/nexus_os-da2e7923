import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { APPS } from "@/os/apps";

type Pos = { x: number; y: number };
type Positions = Record<string, Pos>;

const STORAGE_KEY = "nexus.desktop.iconPositions.v1";
const GRID = 8;
const ICON_W = 96;
const ICON_H = 96;

function loadPositions(): Positions {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function defaultPosition(index: number): Pos {
  // Stack vertically along the left edge by default
  return { x: 16, y: 16 + index * (ICON_H + 8) };
}

export function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const dragInfo = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(
    null,
  );

  const desktopApps = APPS.filter((a) => a.showOnDesktop);

  useEffect(() => {
    const stored = loadPositions();
    const next: Positions = {};
    desktopApps.forEach((app, i) => {
      next[app.id] = stored[app.id] ?? defaultPosition(i);
    });
    setPositions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePositions = (next: Positions) => {
    setPositions(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelected(id);
    const target = e.currentTarget as HTMLElement;
    const parentRect = target.parentElement!.getBoundingClientRect();
    const pos = positions[id] ?? { x: 0, y: 0 };
    dragInfo.current = {
      id,
      offsetX: e.clientX - parentRect.left - pos.x,
      offsetY: e.clientY - parentRect.top - pos.y,
      moved: false,
    };
    target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const info = dragInfo.current;
    if (!info) return;
    const parent = (e.currentTarget as HTMLElement).parentElement!;
    const parentRect = parent.getBoundingClientRect();
    let x = e.clientX - parentRect.left - info.offsetX;
    let y = e.clientY - parentRect.top - info.offsetY;
    x = Math.max(0, Math.min(parentRect.width - ICON_W, x));
    y = Math.max(0, Math.min(parentRect.height - ICON_H, y));
    info.moved = true;
    setDragging(info.id);
    setPositions((p) => ({ ...p, [info.id]: { x, y } }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const info = dragInfo.current;
    if (!info) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (info.moved) {
      // Snap to grid
      setPositions((p) => {
        const cur = p[info.id];
        if (!cur) return p;
        const snapped = {
          x: Math.round(cur.x / GRID) * GRID,
          y: Math.round(cur.y / GRID) * GRID,
        };
        const next = { ...p, [info.id]: snapped };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
    dragInfo.current = null;
    setDragging(null);
  };

  return (
    <div
      className="absolute inset-0"
      onClick={() => setSelected(null)}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      {desktopApps.map((app) => {
        const Icon = app.icon;
        const pos = positions[app.id] ?? { x: 16, y: 16 };
        const isDragging = dragging === app.id;
        return (
          <button
            key={app.id}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              width: ICON_W,
              touchAction: "none",
              cursor: isDragging ? "grabbing" : "grab",
              zIndex: isDragging ? 20 : 1,
            }}
            onPointerDown={(e) => onPointerDown(e, app.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              openApp(app.id);
            }}
            className={[
              "absolute left-0 top-0 flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors select-none",
              selected === app.id ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10",
              isDragging ? "opacity-90 scale-105" : "",
            ].join(" ")}
          >
            <span
              className={`pointer-events-none grid size-12 place-items-center rounded-xl bg-gradient-to-br ${app.tile} shadow-[var(--shadow-glass)]`}
            >
              <Icon className="size-6 text-white" />
            </span>
            <span className="pointer-events-none text-xs font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {app.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
