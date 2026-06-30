import { useEffect, useState } from "react";
import { useOS } from "@/os/store";

const CB_MATRICES: Record<string, string> = {
  protanopia:
    "0.567 0.433 0     0 0  0.558 0.442 0     0 0  0     0.242 0.758 0 0  0 0 0 1 0",
  deuteranopia:
    "0.625 0.375 0     0 0  0.7   0.3   0     0 0  0     0.3   0.7   0 0  0 0 0 1 0",
  tritanopia:
    "0.95  0.05  0     0 0  0     0.433 0.567 0 0  0     0.475 0.525 0 0  0 0 0 1 0",
  achromatopsia:
    "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0",
};

export function AccessibilityOverlays() {
  const a = useOS((s) => s.accessibility);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Apply CSS-side toggles to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.highContrast = a.highContrast ? "on" : "off";
    root.dataset.largeCursor = a.largeCursor ? "on" : "off";
    if (a.colorBlind !== "none") {
      root.style.filter = `url(#cb-${a.colorBlind})`;
    } else {
      root.style.filter = "";
    }
    return () => {
      root.style.filter = "";
    };
  }, [a.highContrast, a.colorBlind, a.largeCursor]);

  // Track cursor for magnifier
  useEffect(() => {
    if (!a.magnifier) return;
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [a.magnifier]);

  return (
    <>
      {/* SVG color-blind matrices */}
      <svg className="pointer-events-none fixed size-0">
        <defs>
          {Object.entries(CB_MATRICES).map(([k, v]) => (
            <filter id={`cb-${k}`} key={k}>
              <feColorMatrix type="matrix" values={v} />
            </filter>
          ))}
        </defs>
      </svg>

      {/* High contrast layer */}
      {a.highContrast && (
        <style>{`
          html[data-high-contrast="on"] { filter: contrast(1.35) saturate(1.2); }
          html[data-high-contrast="on"] body { background: #000 !important; }
          html[data-high-contrast="on"] * { text-shadow: none !important; }
        `}</style>
      )}

      {/* Large cursor */}
      {a.largeCursor && (
        <style>{`
          html[data-large-cursor="on"], html[data-large-cursor="on"] * {
            cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><path d='M4 2 L4 32 L12 24 L18 36 L24 34 L18 22 L30 22 Z' fill='white' stroke='black' stroke-width='2'/></svg>") 2 2, auto !important;
          }
        `}</style>
      )}

      {/* Magnifier lens */}
      {a.magnifier && mouse.x > 0 && (
        <div
          className="pointer-events-none fixed z-[9999] overflow-hidden rounded-full border-2 border-primary shadow-2xl"
          style={{
            left: mouse.x - 90,
            top: mouse.y - 90,
            width: 180,
            height: 180,
          }}
        >
          <div
            className="absolute"
            style={{
              left: -mouse.x * (a.magnifierZoom - 1) - 90 * (a.magnifierZoom - 1) + 90,
              top: -mouse.y * (a.magnifierZoom - 1) - 90 * (a.magnifierZoom - 1) + 90,
              width: window.innerWidth,
              height: window.innerHeight,
              transform: `scale(${a.magnifierZoom})`,
              transformOrigin: `${mouse.x}px ${mouse.y}px`,
              backgroundImage: "linear-gradient(rgba(0,0,0,0.001), rgba(0,0,0,0.001))",
            }}
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />
        </div>
      )}
    </>
  );
}

export function OnScreenKeyboard() {
  const enabled = useOS((s) => s.accessibility.onScreenKeyboard);
  const [shift, setShift] = useState(false);
  const [pos, setPos] = useState({ x: 80, y: window.innerHeight - 280 });
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  if (!enabled) return null;

  const rows = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ];

  const press = (char: string) => {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const value = shift ? char.toUpperCase() : char;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const s = el.selectionStart ?? el.value.length;
      const e = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, s) + value + el.value.slice(e);
      el.setSelectionRange(s + value.length, s + value.length);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.isContentEditable) {
      document.execCommand("insertText", false, value);
    }
    if (shift) setShift(false);
  };

  const special = (key: string) => {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    if (key === "Backspace" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      const s = el.selectionStart ?? 0;
      const e = el.selectionEnd ?? 0;
      if (s === e && s > 0) {
        el.value = el.value.slice(0, s - 1) + el.value.slice(e);
        el.setSelectionRange(s - 1, s - 1);
      } else {
        el.value = el.value.slice(0, s) + el.value.slice(e);
        el.setSelectionRange(s, s);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (key === " ") {
      press(" ");
    } else if (key === "Enter") {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
  };

  return (
    <div
      className="fixed z-[9998] select-none rounded-xl border border-glass-border bg-black/80 p-2 shadow-2xl backdrop-blur"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={(e) => setDrag({ dx: e.clientX - pos.x, dy: e.clientY - pos.y })}
        className="mb-1.5 cursor-grab rounded bg-white/10 px-2 py-1 text-center text-[10px] uppercase tracking-wider text-white/60"
      >
        On-Screen Keyboard
      </div>
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className="h-8 min-w-8 rounded bg-white/10 px-2 text-xs text-white hover:bg-white/20"
              >
                {shift ? k.toUpperCase() : k}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1">
          <button
            onClick={() => setShift((v) => !v)}
            className={`h-8 rounded px-3 text-xs text-white ${shift ? "bg-primary" : "bg-white/10 hover:bg-white/20"}`}
          >
            ⇧ Shift
          </button>
          <button onClick={() => special(" ")} className="h-8 flex-1 rounded bg-white/10 px-3 text-xs text-white hover:bg-white/20">
            Space
          </button>
          <button onClick={() => special("Backspace")} className="h-8 rounded bg-white/10 px-3 text-xs text-white hover:bg-white/20">
            ⌫
          </button>
          <button onClick={() => special("Enter")} className="h-8 rounded bg-white/10 px-3 text-xs text-white hover:bg-white/20">
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}
