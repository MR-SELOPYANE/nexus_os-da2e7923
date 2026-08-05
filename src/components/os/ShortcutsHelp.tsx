import { useEffect } from "react";
import { X } from "lucide-react";

interface Shortcut {
  keys: string;
  action: string;
  group: string;
}

const SHORTCUTS: Shortcut[] = [
  { group: "Windows", keys: "Alt + Tab", action: "Switch between open windows" },
  { group: "Windows", keys: "Alt + M", action: "Minimize the active window" },
  { group: "Windows", keys: "Meta + ← / →", action: "Snap active window to left / right half" },
  { group: "Windows", keys: "Meta + ↑", action: "Maximize active window" },
  { group: "Windows", keys: "Meta + ↓", action: "Restore / minimize active window" },
  { group: "System", keys: "Ctrl + K", action: "Open global command palette (Spotlight)" },
  { group: "System", keys: "Alt + Space", action: "Open Spotlight" },
  { group: "System", keys: "Meta + E", action: "Open Files" },
  { group: "System", keys: "Meta + T", action: "Open Terminal" },
  { group: "System", keys: "Meta + R", action: "Run dialog" },
  { group: "System", keys: "Meta + L", action: "Lock screen" },
  { group: "System", keys: "Ctrl + Shift + Esc", action: "Open Task Manager" },
  { group: "System", keys: "Ctrl + ?", action: "Show this shortcuts panel" },
  { group: "Power & Media", keys: "PrtSc / Ctrl + Shift + S", action: "Capture screenshot" },
  { group: "Power & Media", keys: "Ctrl + Shift + V", action: "Open Clipboard Manager" },
  { group: "Power & Media", keys: "Ctrl + Shift + J", action: "Summon Jarvis HUD" },
  { group: "Desktops", keys: "Ctrl + Alt + ← / →", action: "Switch virtual desktop" },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 os-scroll">
          {groups.map((g) => (
            <div key={g} className="mb-5 last:mb-0">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g}
              </div>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between rounded-lg border border-border bg-black/10 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{s.action}</span>
                    <kbd className="rounded-md border border-border bg-black/40 px-2 py-0.5 font-mono text-xs text-foreground">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
