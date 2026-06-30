import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileText, FolderOpen, AppWindow, Settings as SettingsIcon, Terminal as TermIcon } from "lucide-react";
import { useOS, type AppId } from "@/os/store";
import { APPS } from "@/os/apps";
import { isFolder, type FolderNode } from "@/os/fs";

interface FileHit {
  path: string;
  isFolder: boolean;
}

function flattenFs(root: FolderNode, prefix = ""): FileHit[] {
  const out: FileHit[] = [];
  for (const [name, node] of Object.entries(root.children)) {
    const path = `${prefix}/${name}`;
    if (isFolder(node)) {
      out.push({ path, isFolder: true });
      out.push(...flattenFs(node, path));
    } else {
      out.push({ path, isFolder: false });
    }
  }
  return out;
}

interface Result {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
  group: "Apps" | "Files" | "Settings" | "Commands";
}

const SETTINGS_PAGES = [
  { label: "Appearance", hint: "Wallpaper, accent color" },
  { label: "Network", hint: "Wi-Fi, airplane mode" },
  { label: "Updates", hint: "Check for NEXUS updates" },
  { label: "Recovery", hint: "Restore points" },
  { label: "Account", hint: "User profile" },
];

const COMMANDS = [
  { label: "Lock screen", run: (s: ReturnType<typeof useOS.getState>) => s.lock() },
  { label: "Sign out", run: (s: ReturnType<typeof useOS.getState>) => s.logout() },
  { label: "Toggle Do Not Disturb", run: (s: ReturnType<typeof useOS.getState>) => s.setQuick({ doNotDisturb: !s.quick.doNotDisturb }) },
  { label: "Toggle Night Light", run: (s: ReturnType<typeof useOS.getState>) => s.setQuick({ nightLight: !s.quick.nightLight }) },
  { label: "Toggle Airplane Mode", run: (s: ReturnType<typeof useOS.getState>) => s.toggleAirplane() },
  { label: "Check for updates", run: (s: ReturnType<typeof useOS.getState>) => { s.openApp("update"); void s.checkForUpdates(); } },
  { label: "New restore point", run: (s: ReturnType<typeof useOS.getState>) => s.createRestorePoint("") },
];

export function Spotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fs = useOS((s) => s.fs);
  const openApp = useOS((s) => s.openApp);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const allFiles = useMemo(() => flattenFs(fs), [fs]);

  const results: Result[] = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out: Result[] = [];

    // Apps
    for (const app of APPS) {
      if (!query || app.name.toLowerCase().includes(query) || app.id.includes(query)) {
        out.push({
          key: `app:${app.id}`,
          label: app.name,
          hint: "Application",
          icon: <AppWindow className="size-4" />,
          run: () => openApp(app.id as AppId),
          group: "Apps",
        });
      }
    }

    // Files (limit)
    if (query) {
      for (const f of allFiles) {
        if (f.path.toLowerCase().includes(query)) {
          out.push({
            key: `file:${f.path}`,
            label: f.path.split("/").pop() ?? f.path,
            hint: f.path,
            icon: f.isFolder ? <FolderOpen className="size-4" /> : <FileText className="size-4" />,
            run: () => openApp("files", { path: f.isFolder ? f.path : f.path.split("/").slice(0, -1).join("/") || "/" }),
            group: "Files",
          });
        }
        if (out.filter((r) => r.group === "Files").length >= 8) break;
      }
    }

    // Settings
    for (const sp of SETTINGS_PAGES) {
      if (!query || sp.label.toLowerCase().includes(query) || sp.hint.toLowerCase().includes(query)) {
        out.push({
          key: `setting:${sp.label}`,
          label: sp.label,
          hint: sp.hint,
          icon: <SettingsIcon className="size-4" />,
          run: () => openApp("settings"),
          group: "Settings",
        });
      }
    }

    // Commands
    for (const c of COMMANDS) {
      if (!query || c.label.toLowerCase().includes(query)) {
        out.push({
          key: `cmd:${c.label}`,
          label: c.label,
          hint: "Command",
          icon: <TermIcon className="size-4" />,
          run: () => c.run(useOS.getState()),
          group: "Commands",
        });
      }
    }

    return out.slice(0, 30);
  }, [q, allFiles, openApp]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) {
        r.run();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/30 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] overflow-hidden rounded-2xl glass-strong shadow-[var(--shadow-window)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-glass-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search apps, files, settings, commands…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto os-scroll p-1">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches</p>
          ) : (
            results.map((r, i) => {
              const showHeader = r.group !== lastGroup;
              lastGroup = r.group;
              return (
                <div key={r.key}>
                  {showHeader && (
                    <p className="mt-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {r.group}
                    </p>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      r.run();
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      i === active ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="grid size-7 place-items-center rounded-md bg-white/5 text-muted-foreground">
                      {r.icon}
                    </span>
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{r.hint}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-glass-border bg-black/20 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · Esc close</span>
          <span>Nexus Spotlight</span>
        </div>
      </div>
    </div>
  );
}
