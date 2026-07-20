import { useEffect, useMemo, useState } from "react";
import { Cloud, Cpu, MemoryStick, CalendarDays, Sun, CloudRain, Snowflake, StickyNote, Zap } from "lucide-react";
import { useOS } from "@/os/store";

const WEATHER_PRESETS = [
  { icon: Sun, label: "Sunny", temp: 24 },
  { icon: Cloud, label: "Partly cloudy", temp: 18 },
  { icon: CloudRain, label: "Light rain", temp: 14 },
  { icon: Snowflake, label: "Snow showers", temp: -2 },
];

export function Widgets() {
  const visible = useOS((s) => s.quick.widgetsVisible);
  const focusMode = useOS((s) => s.quick.focusMode);
  const enabled = useOS((s) => s.settings.enabledWidgets);
  const stickyNote = useOS((s) => s.settings.stickyNote);
  const updateSettings = useOS((s) => s.updateSettings);
  const processes = useOS((s) => s.processes);
  const events = useOS((s) => s.events);
  const online = useOS((s) => s.network.online);
  const sa = useOS((s) => s.sa);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const weather = useMemo(() => {
    const day = Math.floor((+now - +new Date(now.getFullYear(), 0, 0)) / 86400000);
    return WEATHER_PRESETS[day % WEATHER_PRESETS.length];
  }, [now]);

  const todayEvents = useMemo(() => {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return events.filter((e) => e.date === iso).slice(0, 4);
  }, [events, now]);

  const cpu = Math.min(100, processes.reduce((a, p) => a + p.cpu, 0));
  const mem = processes.reduce((a, p) => a + p.memory, 0);

  // Load-shedding: deterministic 2h slot within the current 4h window, keyed by stage + province.
  const loadshed = useMemo(() => {
    const stage = sa.loadSheddingStage;
    if (stage === 0) return { active: false, nextIn: 0, label: "" };
    const provinceSeed = (sa.province || "").length;
    const blockHours = Math.max(2, 6 - stage); // higher stage → outages sooner
    const baseHour = (now.getHours() + provinceSeed) % blockHours;
    const minsUntil = ((blockHours - baseHour) * 60) - now.getMinutes();
    const hh = Math.floor(minsUntil / 60);
    const mm = minsUntil % 60;
    return {
      active: true,
      nextIn: minsUntil,
      label: `${hh}h ${String(mm).padStart(2, "0")}m`,
    };
  }, [sa.loadSheddingStage, sa.province, now]);

  // Hide widgets when off, in focus/gaming mode
  if (!visible || focusMode !== "off") return null;

  const Wi = weather.icon;
  const has = (id: string) => enabled.includes(id as never);

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-0 flex w-64 flex-col gap-3">
      {has("clock") && (
        <div className="pointer-events-auto rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)]">
          <p className="font-mono text-4xl tabular-nums leading-none">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      )}

      {has("weather") && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)]">
          <Wi className="size-10 text-primary" />
          <div className="flex-1">
            <p className="text-3xl font-semibold leading-none">{weather.temp}°</p>
            <p className="text-xs text-muted-foreground">{weather.label}</p>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {online ? "Live" : "Cached"}
          </p>
        </div>
      )}

      {has("system") && (
        <div className="pointer-events-auto rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)]">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">System</p>
          <Bar icon={<Cpu className="size-3.5" />} label="CPU" value={`${cpu.toFixed(0)}%`} pct={cpu} />
          <div className="h-2" />
          <Bar
            icon={<MemoryStick className="size-3.5" />}
            label="Memory"
            value={`${(mem / 1024).toFixed(1)} GB`}
            pct={Math.min(100, (mem / 4096) * 100)}
          />
        </div>
      )}

      {has("events") && (
        <div className="pointer-events-auto rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)]">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="size-3.5" /> Today
          </p>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-1">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="flex-1 truncate">{e.title}</span>
                  {e.time && (
                    <span className="font-mono tabular-nums text-muted-foreground">{e.time}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {has("loadshedding") && (
        <div className="pointer-events-auto rounded-2xl glass-strong p-4 shadow-[var(--shadow-window)]">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Zap className="size-3.5 text-amber-400" /> Load shedding · {sa.province}
          </p>
          {loadshed.active ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-300">Stage {sa.loadSheddingStage}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Next outage in <span className="font-mono text-foreground">{loadshed.label}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500"
                  style={{ width: `${Math.max(6, Math.min(100, sa.loadSheddingStage * 12))}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-emerald-400">Stage 0</p>
              <p className="mt-1 text-xs text-muted-foreground">No outages scheduled 🇿🇦</p>
            </>
          )}
        </div>
      )}

      {has("note") && (
        <div className="pointer-events-auto rounded-2xl glass-strong p-3 shadow-[var(--shadow-window)]">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <StickyNote className="size-3.5" /> Quick note
          </p>
          <textarea
            value={stickyNote}
            onChange={(e) => updateSettings({ stickyNote: e.target.value })}
            placeholder="Jot something down…"
            className="h-24 w-full resize-none rounded-md border border-glass-border bg-white/5 p-2 text-xs outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      )}
    </div>
  );
}

function Bar({
  icon,
  label,
  value,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
