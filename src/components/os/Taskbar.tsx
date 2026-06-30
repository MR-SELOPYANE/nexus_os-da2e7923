import { useEffect, useState } from "react";
import { Bell, LayoutGrid, Wifi, WifiOff, Plane, Plus } from "lucide-react";
import { useOS } from "@/os/store";
import { APP_MAP, APPS } from "@/os/apps";
import { cn } from "@/lib/utils";

export function Taskbar({ onToggleNotifications }: { onToggleNotifications: () => void }) {
  const windows = useOS((s) => s.windows);
  const activeDesktopId = useOS((s) => s.activeDesktopId);
  const desktops = useOS((s) => s.desktops);
  const switchDesktop = useOS((s) => s.switchDesktop);
  const addDesktop = useOS((s) => s.addDesktop);
  const removeDesktop = useOS((s) => s.removeDesktop);
  const focusWindow = useOS((s) => s.focusWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const restoreWindow = useOS((s) => s.restoreWindow);
  const openApp = useOS((s) => s.openApp);
  const toggleStart = useOS((s) => s.toggleStartMenu);
  const startOpen = useOS((s) => s.startMenuOpen);
  const notifications = useOS((s) => s.notifications);
  const taskbarPosition = useOS((s) => s.settings.taskbarPosition);
  const clock24h = useOS((s) => s.settings.clock24h);

  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  const desktopWindows = windows.filter((w) => w.desktopId === activeDesktopId);

  // top window on the active desktop
  const topId = desktopWindows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id;

  const dockApps = APPS.filter((a) => a.showOnDesktop || a.id === "settings");

  const handleDockClick = (appId: (typeof APPS)[number]["id"]) => {
    const open = desktopWindows.filter((w) => w.appId === appId);
    if (open.length === 0) {
      openApp(appId);
    } else if (open.some((w) => w.id === topId)) {
      minimizeWindow(open[0].id);
    } else {
      const w = open[0];
      if (w.minimized) restoreWindow(w.id);
      else focusWindow(w.id);
    }
  };

  return (
    <div data-taskbar className={cn("pointer-events-none absolute inset-x-0 z-[9999] flex justify-center p-2.5", taskbarPosition === "top" ? "top-0" : "bottom-0")}>
      <div className="pointer-events-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl taskbar-glass px-2.5 py-1.5 shadow-[var(--shadow-window)]">
        {/* Start */}
        <button
          onClick={() => toggleStart()}
          className={cn(
            "grid size-10 place-items-center rounded-xl transition-colors",
            startOpen ? "bg-primary text-primary-foreground" : "hover:bg-white/10"
          )}
          aria-label="Start menu"
        >
          <LayoutGrid className="size-5" />
        </button>

        <div className="mx-0.5 h-7 w-px bg-white/15" />

        {/* Dock apps */}
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {dockApps.map((app) => {
            const Icon = app.icon;
            const open = desktopWindows.filter((w) => w.appId === app.id);
            const isActive = open.some((w) => w.id === topId);
            return (
              <button
                key={app.id}
                onClick={() => handleDockClick(app.id)}
                title={app.name}
                className="group relative grid size-10 shrink-0 place-items-center rounded-xl hover:bg-white/10"
              >
                <span
                  className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br ${app.tile}`}
                >
                  <Icon className="size-4 text-white" />
                </span>
                {open.length > 0 && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 h-1 rounded-full transition-all",
                      isActive ? "w-4 bg-primary" : "w-1.5 bg-white/60"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mx-0.5 h-7 w-px bg-white/15" />

        {/* Virtual desktops */}
        <div className="flex items-center gap-0.5 rounded-xl bg-white/5 px-1 py-0.5" title="Virtual desktops (Ctrl+Alt+←/→)">
          {desktops.map((d, i) => (
            <button
              key={d.id}
              onClick={() => switchDesktop(d.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (desktops.length > 1) removeDesktop(d.id);
              }}
              title={`${d.name}${desktops.length > 1 ? " (right-click to remove)" : ""}`}
              className={cn(
                "grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[11px] font-semibold transition-colors",
                d.id === activeDesktopId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => {
              const id = addDesktop();
              switchDesktop(id);
            }}
            title="New desktop"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <div className="mx-0.5 h-7 w-px bg-white/15" />

        {/* Network */}
        <NetworkButton />

        {/* Tray */}
        <button
          onClick={onToggleNotifications}
          className="relative grid size-9 place-items-center rounded-xl hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {notifications.length > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {notifications.length}
            </span>
          )}
        </button>

        <div className="px-1.5 text-right leading-tight">
          <p className="text-sm font-medium tabular-nums">
            {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !clock24h })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {clock.toLocaleDateString([], { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function NetworkButton() {
  const network = useOS((s) => s.network);
  const openApp = useOS((s) => s.openApp);
  const Icon = network.airplane ? Plane : network.online ? Wifi : WifiOff;
  return (
    <button
      onClick={() => openApp("network")}
      className="grid size-9 place-items-center rounded-xl hover:bg-white/10"
      title={network.airplane ? "Airplane mode" : network.ssid ?? "Disconnected"}
      aria-label="Network"
    >
      <Icon className={cn("size-5", network.online && !network.airplane ? "" : "text-muted-foreground")} />
    </button>
  );
}

void APP_MAP;
