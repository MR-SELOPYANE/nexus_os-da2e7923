import { X, Bell, Trash2, Wifi, Plane, BellOff, Moon, Sun, Volume2, LayoutDashboard, Sliders, Focus, Gamepad2, Circle } from "lucide-react";
import { useOS, type AppId, type WidgetId } from "@/os/store";
import { APP_MAP } from "@/os/apps";
import { cn } from "@/lib/utils";
import { useState } from "react";

const WIDGET_LABELS: Record<WidgetId, string> = {
  clock: "Clock",
  weather: "Weather",
  system: "System",
  events: "Events",
  note: "Quick note",
};


export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useOS((s) => s.notifications);
  const dismiss = useOS((s) => s.dismissNotification);
  const clear = useOS((s) => s.clearNotifications);
  const quick = useOS((s) => s.quick);
  const setQuick = useOS((s) => s.setQuick);
  const network = useOS((s) => s.network);
  const toggleAirplane = useOS((s) => s.toggleAirplane);
  const connectWifi = useOS((s) => s.connectWifi);
  const disconnectWifi = useOS((s) => s.disconnectWifi);
  const windows = useOS((s) => s.windows);
  const appVolumes = useOS((s) => s.appVolumes);
  const setAppVolume = useOS((s) => s.setAppVolume);
  const [mixerOpen, setMixerOpen] = useState(false);

  if (!open) return null;

  // Unique appIds with an open window
  const runningApps = Array.from(new Set(windows.map((w) => w.appId))) as AppId[];

  const toggleWifi = () => {
    if (network.airplane) return;
    if (network.online) disconnectWifi();
    else connectWifi(network.networks[0]?.ssid ?? "Nexus-Home");
  };

  return (
    <div className="absolute bottom-20 right-3 z-[9998] w-[22rem] max-w-[94vw] rounded-2xl glass-strong p-3 shadow-[var(--shadow-window)] animate-fade-up">
      {/* Quick toggles */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <Toggle
          icon={<Wifi className="size-4" />}
          label="Wi-Fi"
          active={network.online && !network.airplane}
          onClick={toggleWifi}
        />
        <Toggle
          icon={<Plane className="size-4" />}
          label="Airplane"
          active={network.airplane}
          onClick={toggleAirplane}
        />
        <Toggle
          icon={quick.doNotDisturb ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          label="DND"
          active={quick.doNotDisturb}
          onClick={() => setQuick({ doNotDisturb: !quick.doNotDisturb })}
        />
        <Toggle
          icon={quick.nightLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
          label="Night"
          active={quick.nightLight}
          onClick={() => setQuick({ nightLight: !quick.nightLight })}
        />
      </div>

      {/* Sliders */}
      <div className="mb-3 space-y-2.5 rounded-xl border border-glass-border bg-white/5 p-3">
        <Slider
          icon={<Sun className="size-3.5" />}
          label="Brightness"
          value={quick.brightness}
          min={30}
          max={100}
          onChange={(v) => setQuick({ brightness: v })}
        />
        <Slider
          icon={<Volume2 className="size-3.5" />}
          label="Volume"
          value={quick.volume}
          min={0}
          max={100}
          onChange={(v) => setQuick({ volume: v })}
        />
      </div>

      {/* Audio mixer */}
      <div className="mb-3 rounded-xl border border-glass-border bg-white/5">
        <button
          onClick={() => setMixerOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Sliders className="size-4 text-muted-foreground" /> Audio mixer
          </span>
          <span className="text-[11px] text-muted-foreground">
            {mixerOpen ? "Hide" : `${runningApps.length} app${runningApps.length === 1 ? "" : "s"}`}
          </span>
        </button>
        {mixerOpen && (
          <div className="space-y-2 px-3 pb-3">
            {runningApps.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">No apps are running.</p>
            )}
            {runningApps.map((id) => {
              const meta = APP_MAP[id];
              if (!meta) return null;
              const Icon = meta.icon;
              const v = appVolumes[id] ?? 80;
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br ${meta.tile}`}>
                    <Icon className="size-3.5 text-white" />
                  </span>
                  <span className="w-20 truncate text-[11px]">{meta.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={v}
                    onChange={(e) => setAppVolume(id, +e.target.value)}
                    className="flex-1 accent-[hsl(var(--primary))]"
                  />
                  <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">{v}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focus / Gaming mode */}
      <FocusModeCard />

      {/* Widgets toggle + picker */}
      <div className="mb-3 rounded-xl border border-glass-border bg-white/5">
        <button
          onClick={() => setQuick({ widgetsVisible: !quick.widgetsVisible })}
          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-white/8"
        >
          <span className="flex items-center gap-2">
            <LayoutDashboard className="size-4 text-muted-foreground" /> Desktop widgets
          </span>
          <span
            className={cn(
              "h-5 w-9 rounded-full p-0.5 transition-colors",
              quick.widgetsVisible ? "bg-primary" : "bg-white/15"
            )}
          >
            <span
              className={cn(
                "block size-4 rounded-full bg-white transition-transform",
                quick.widgetsVisible ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
        </button>
        {quick.widgetsVisible && <WidgetPicker />}
      </div>


      {/* Notifications */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-primary" /> Notifications
        </h3>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button
              onClick={clear}
              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
              title="Clear all"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto os-scroll">
        {notifications.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {quick.doNotDisturb ? "Do Not Disturb is on" : "No notifications"}
          </p>
        )}
        {notifications.map((n) => {
          const Icon = n.appId ? APP_MAP[n.appId].icon : Bell;
          return (
            <div
              key={n.id}
              className="group relative rounded-xl border border-glass-border bg-white/5 p-3"
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="break-words text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="hidden rounded p-0.5 text-muted-foreground hover:text-foreground group-hover:block"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Slider({
  icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span className="flex-1">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );
}

function FocusModeCard() {
  const focusMode = useOS((s) => s.quick.focusMode);
  const setQuick = useOS((s) => s.setQuick);
  const modes: { id: "off" | "focus" | "gaming"; label: string; icon: typeof Focus; hint: string }[] = [
    { id: "off", label: "Off", icon: Circle, hint: "Everything on" },
    { id: "focus", label: "Focus", icon: Focus, hint: "Hide widgets, mute pings" },
    { id: "gaming", label: "Gaming", icon: Gamepad2, hint: "Silence & smooth perf" },
  ];
  return (
    <div className="mb-3 rounded-xl border border-glass-border bg-white/5 p-2">
      <p className="mb-1.5 px-1 text-[11px] uppercase tracking-wider text-muted-foreground">Focus mode</p>
      <div className="grid grid-cols-3 gap-1.5">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = focusMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setQuick({ focusMode: m.id })}
              title={m.hint}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              <Icon className="size-4" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WidgetPicker() {
  const enabled = useOS((s) => s.settings.enabledWidgets);
  const updateSettings = useOS((s) => s.updateSettings);
  const items: WidgetId[] = ["clock", "weather", "system", "events", "note"];
  const toggle = (id: WidgetId) =>
    updateSettings({
      enabledWidgets: enabled.includes(id)
        ? enabled.filter((x) => x !== id)
        : [...enabled, id],
    });
  return (
    <div className="flex flex-wrap gap-1 border-t border-glass-border px-3 py-2">
      {items.map((id) => {
        const on = enabled.includes(id);
        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              on
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
          >
            {WIDGET_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

