import { useEffect, useRef, useState } from "react";
import { Power, Search, LogOut, Lock, Users, Sparkles } from "lucide-react";
import { useOS } from "@/os/store";
import { APPS } from "@/os/apps";

export function StartMenu({ onOpenSpotlight }: { onOpenSpotlight?: () => void }) {
  const open = useOS((s) => s.startMenuOpen);
  const toggle = useOS((s) => s.toggleStartMenu);
  const openApp = useOS((s) => s.openApp);
  const logout = useOS((s) => s.logout);
  const lock = useOS((s) => s.lock);
  const shutdown = useOS((s) => s.shutdown);
  const username = useOS((s) => s.settings.username);
  const profiles = useOS((s) => s.profiles);
  const activeProfileId = useOS((s) => s.activeProfileId);
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (!open) setQ("");
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) toggle(false);
    }
    if (open) {
      // delay to avoid catching the same click that opened it
      const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
      return () => {
        clearTimeout(t);
        document.removeEventListener("pointerdown", onDown);
      };
    }
  }, [open, toggle]);

  if (!open) return null;

  const filtered = APPS.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      ref={ref}
      className="absolute bottom-20 left-1/2 z-[9998] w-[420px] max-w-[92vw] -translate-x-1/2 rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)] animate-fade-up"
    >
      <button
        onClick={() => {
          toggle(false);
          onOpenSpotlight?.();
        }}
        className="mb-3 flex w-full items-center gap-2 rounded-xl border border-input bg-black/20 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5"
      >
        <Sparkles className="size-4 text-primary" />
        <span className="flex-1">Spotlight — search anything</span>
        <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-input bg-black/20 px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        All apps
      </p>
      <div className="grid grid-cols-4 gap-1">
        {filtered.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              onClick={() => openApp(app.id)}
              className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-colors hover:bg-white/10"
            >
              <span
                className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${app.tile}`}
              >
                <Icon className="size-5 text-white" />
              </span>
              <span className="text-xs">{app.name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-4 py-6 text-center text-sm text-muted-foreground">No apps found</p>
        )}
      </div>

      <div className="mt-4 border-t border-glass-border pt-3">
        {showUsers ? (
          <div className="space-y-1">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Switch account
            </p>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setShowUsers(false);
                  toggle(false);
                  if (p.id === activeProfileId) return;
                  // lock to login screen so user picks the target profile (handles PINs)
                  useOS.getState().lock();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
              >
                <span className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${p.color} text-xs font-semibold text-primary-foreground`}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1">{p.name}</span>
                {p.id === activeProfileId && (
                  <span className="text-[10px] text-muted-foreground">Active</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowUsers(false)}
              className="mt-1 w-full rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowUsers(true)}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/5"
              title="Switch account"
            >
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan-600 text-sm font-semibold text-primary-foreground">
                {username.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{username}</span>
              <Users className="size-3.5 text-muted-foreground" />
            </button>
            <div className="flex gap-1">
              <button
                onClick={lock}
                title="Lock"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <Lock className="size-4" /> Lock
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
              <button
                onClick={shutdown}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                title="Shut down"
              >
                <Power className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
