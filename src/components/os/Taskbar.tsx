import { useEffect, useState } from "react";
import { Bell, LayoutGrid, Wifi, WifiOff, Plane, Plus, Pin, PinOff, X as XIcon, Focus, Gamepad2 } from "lucide-react";
import { useOS, type AppId } from "@/os/store";
import { APP_MAP, APPS } from "@/os/apps";
import { cn } from "@/lib/utils";

interface DockMenu {
  x: number;
  y: number;
  appId: AppId;
}

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
  const closeWindow = useOS((s) => s.closeWindow);
  const openApp = useOS((s) => s.openApp);
  const toggleStart = useOS((s) => s.toggleStartMenu);
  const startOpen = useOS((s) => s.startMenuOpen);
  const notifications = useOS((s) => s.notifications);
  const taskbarPosition = useOS((s) => s.settings.taskbarPosition);
  const clock24h = useOS((s) => s.settings.clock24h);
  const pinnedApps = useOS((s) => s.settings.pinnedApps);
  const updateSettings = useOS((s) => s.updateSettings);
  const focusMode = useOS((s) => s.quick.focusMode);
  const setQuick = useOS((s) => s.setQuick);

  const [clock, setClock] = useState(() => new Date());
  const [menu, setMenu] = useState<DockMenu | null>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const desktopWindows = windows.filter((w) => w.desktopId === activeDesktopId);
  const topId = desktopWindows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id;

  // Pinned + any running apps that aren't pinned (so they still appear)
  const runningIds = Array.from(new Set(desktopWindows.map((w) => w.appId)));
  const dockIds: AppId[] = [
    ...pinnedApps,
    ...runningIds.filter((id) => !pinnedApps.includes(id)),
  ];
  const dockApps = dockIds
    .map((id) => APPS.find((a) => a.id === id))
    .filter((a): a is (typeof APPS)[number] => !!a);

  const handleDockClick = (appId: AppId) => {
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

  const isPinned = (id: AppId) => pinnedApps.includes(id);
  const togglePin = (id: AppId) => {
    updateSettings({
      pinnedApps: isPinned(id)
        ? pinnedApps.filter((p) => p !== id)
        : [...pinnedApps, id],
    });
  };

  const cycleFocusMode = () => {
    const next = focusMode === "off" ? "focus" : focusMode === "focus" ? "gaming" : "off";
    setQuick({ focusMode: next });
  };

  const focusIcon = focusMode === "gaming" ? Gamepad2 : Focus;
  const FocusIcon = focusIcon;

  return (
    <>
      <div data-taskbar className={cn("pointer-events-none absolute inset-x-0 z-[9999] flex justify-center p-2.5", taskbarPosition === "top" ? "top-0" : "bottom-0")}>
        <div className="pointer-events-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl taskbar-glass px-2.5 py-1.5 shadow-[var(--shadow-window)]">
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

          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {dockApps.map((app) => {
              const Icon = app.icon;
              const open = desktopWindows.filter((w) => w.appId === app.id);
              const isActive = open.some((w) => w.id === topId);
              const pinned = isPinned(app.id);
              return (
                <button
                  key={app.id}
                  onClick={() => handleDockClick(app.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, appId: app.id });
                  }}
                  title={`${app.name}${pinned ? "" : " (unpinned)"} — right-click for options`}
                  className="group relative grid size-10 shrink-0 place-items-center rounded-xl hover:bg-white/10"
                >
                  <span
                    className={cn(
                      `grid size-8 place-items-center rounded-lg bg-gradient-to-br ${app.tile}`,
                      !pinned && "opacity-80 ring-1 ring-white/20"
                    )}
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

          {/* Focus / Gaming mode */}
          <button
            onClick={cycleFocusMode}
            title={`Focus mode: ${focusMode} — click to cycle (off → focus → gaming)`}
            className={cn(
              "grid size-9 place-items-center rounded-xl transition-colors",
              focusMode === "off"
                ? "hover:bg-white/10 text-muted-foreground"
                : focusMode === "focus"
                ? "bg-primary/20 text-primary"
                : "bg-fuchsia-500/25 text-fuchsia-300"
            )}
            aria-label="Focus mode"
          >
            <FocusIcon className="size-5" />
          </button>

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

          <NetworkButton />

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

      {menu && <DockContextMenu menu={menu} isPinned={isPinned(menu.appId)} onPin={() => { togglePin(menu.appId); setMenu(null); }} onOpen={() => { openApp(menu.appId); setMenu(null); }} onCloseAll={() => {
        desktopWindows.filter((w) => w.appId === menu.appId).forEach((w) => closeWindow(w.id));
        setMenu(null);
      }} hasOpen={desktopWindows.some((w) => w.appId === menu.appId)} />}
    </>
  );
}

function DockContextMenu({
  menu,
  isPinned,
  hasOpen,
  onPin,
  onOpen,
  onCloseAll,
}: {
  menu: DockMenu;
  isPinned: boolean;
  hasOpen: boolean;
  onPin: () => void;
  onOpen: () => void;
  onCloseAll: () => void;
}) {
  const meta = APP_MAP[menu.appId];
  const style: React.CSSProperties = {
    left: Math.min(menu.x, window.innerWidth - 220),
    bottom: Math.max(72, window.innerHeight - menu.y + 8),
  };
  return (
    <div
      className="fixed z-[10000] w-52 rounded-xl glass-strong p-1 text-sm shadow-[var(--shadow-window)] animate-fade-up"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">{meta?.name}</p>
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10"
      >
        <LayoutGrid className="size-4 text-muted-foreground" /> Open new window
      </button>
      <button
        onClick={onPin}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10"
      >
        {isPinned ? <PinOff className="size-4 text-muted-foreground" /> : <Pin className="size-4 text-muted-foreground" />}
        {isPinned ? "Unpin from taskbar" : "Pin to taskbar"}
      </button>
      {hasOpen && (
        <button
          onClick={onCloseAll}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-destructive hover:bg-white/10"
        >
          <XIcon className="size-4" /> Close all windows
        </button>
      )}
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
