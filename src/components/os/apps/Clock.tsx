import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Globe,
  AlarmClock,
  Hourglass,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useOS } from "@/os/store";
import { cn } from "@/lib/utils";

type Tab = "calendar" | "world" | "alarms" | "timer";

export function Clock() {
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
        <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")} icon={<CalendarIcon className="size-4" />}>
          Calendar
        </TabBtn>
        <TabBtn active={tab === "world"} onClick={() => setTab("world")} icon={<Globe className="size-4" />}>
          World clock
        </TabBtn>
        <TabBtn active={tab === "alarms"} onClick={() => setTab("alarms")} icon={<AlarmClock className="size-4" />}>
          Alarms
        </TabBtn>
        <TabBtn active={tab === "timer"} onClick={() => setTab("timer")} icon={<Hourglass className="size-4" />}>
          Timer
        </TabBtn>
      </div>
      <div className="flex-1 overflow-y-auto os-scroll">
        {tab === "calendar" && <CalendarPane />}
        {tab === "world" && <WorldClockPane />}
        {tab === "alarms" && <AlarmsPane />}
        {tab === "timer" && <TimerPane />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"
      )}
    >
      {icon} {children}
    </button>
  );
}

/* -------------------- Calendar -------------------- */

function CalendarPane() {
  const events = useOS((s) => s.events);
  const addEvent = useOS((s) => s.addEvent);
  const removeEvent = useOS((s) => s.removeEvent);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISO(new Date()));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const monthLabel = cursor.toLocaleDateString([], { month: "long", year: "numeric" });
  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDay = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const e of events) (map[e.date] ||= []).push(e);
    return map;
  }, [events]);

  const submit = () => {
    if (!title.trim()) return;
    addEvent({ title: title.trim(), date: selected, time: time || undefined });
    setTitle("");
    setTime("");
  };

  return (
    <div className="grid grid-cols-[1fr_220px] gap-4 p-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="rounded px-2 py-1 text-sm hover:bg-white/5"
          >
            ‹
          </button>
          <h3 className="text-sm font-semibold">{monthLabel}</h3>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="rounded px-2 py-1 text-sm hover:bg-white/5"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSelected = iso === selected;
            const isToday = iso === toISO(new Date());
            const evs = eventsByDay[iso] ?? [];
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={cn(
                  "relative aspect-square rounded-md text-xs",
                  inMonth ? "text-foreground" : "text-muted-foreground/40",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-white/10 ring-1 ring-primary/60"
                      : "hover:bg-white/5"
                )}
              >
                {d.getDate()}
                {evs.length > 0 && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {new Date(selected + "T00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
        </h4>
        <div className="mb-3 space-y-1.5">
          {(eventsByDay[selected] ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No events</p>
          )}
          {(eventsByDay[selected] ?? []).map((e) => (
            <div
              key={e.id}
              className="group flex items-center gap-2 rounded-md border border-border/40 bg-black/20 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{e.title}</p>
                {e.time && <p className="text-[10px] text-muted-foreground">{e.time}</p>}
              </div>
              <button
                onClick={() => removeEvent(e.id)}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-border/40 pt-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New event"
            className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
          <div className="flex gap-1.5">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1 rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={submit}
              className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function buildMonthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/* -------------------- World Clock -------------------- */

const ZONES = [
  { city: "Local", tz: undefined },
  { city: "New York", tz: "America/New_York" },
  { city: "London", tz: "Europe/London" },
  { city: "Berlin", tz: "Europe/Berlin" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
  { city: "Sydney", tz: "Australia/Sydney" },
  { city: "Los Angeles", tz: "America/Los_Angeles" },
  { city: "Dubai", tz: "Asia/Dubai" },
];

function WorldClockPane() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {ZONES.map((z) => (
        <div
          key={z.city}
          className="rounded-lg border border-border/40 bg-black/20 p-3"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{z.city}</p>
          <p className="font-mono text-2xl tabular-nums">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: z.tz })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", timeZone: z.tz })}
          </p>
        </div>
      ))}
    </div>
  );
}

/* -------------------- Alarms -------------------- */

function AlarmsPane() {
  const alarms = useOS((s) => s.alarms);
  const addAlarm = useOS((s) => s.addAlarm);
  const toggleAlarm = useOS((s) => s.toggleAlarm);
  const removeAlarm = useOS((s) => s.removeAlarm);
  const notify = useOS((s) => s.notify);
  const [time, setTime] = useState("07:30");
  const [label, setLabel] = useState("Wake up");

  // Fire alarms (within current minute)
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const stamp = `${hh}:${mm}`;
      for (const a of alarms) {
        if (a.enabled && a.time === stamp && now.getSeconds() < 2) {
          notify({ title: `Alarm · ${a.label || "Alarm"}`, message: `It's ${stamp}` });
        }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [alarms, notify]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-end gap-2 rounded-lg border border-border/40 bg-black/20 p-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex-[2]">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => addAlarm({ time, label, enabled: true })}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          Add
        </button>
      </div>

      {alarms.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No alarms set</p>
      ) : (
        <ul className="space-y-1.5">
          {alarms.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-md border border-border/40 bg-black/20 px-3 py-2"
            >
              <span className={cn("font-mono text-xl tabular-nums", !a.enabled && "text-muted-foreground line-through")}>
                {a.time}
              </span>
              <span className="flex-1 truncate text-sm">{a.label}</span>
              <button
                onClick={() => toggleAlarm(a.id)}
                className={cn(
                  "h-5 w-9 rounded-full p-0.5 transition-colors",
                  a.enabled ? "bg-primary" : "bg-white/15"
                )}
              >
                <span
                  className={cn(
                    "block size-4 rounded-full bg-white transition-transform",
                    a.enabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
              <button
                onClick={() => removeAlarm(a.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------- Timer -------------------- */

function TimerPane() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0); // ms
  const [running, setRunning] = useState(false);
  const notify = useOS((s) => s.notify);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const base = remaining;
    const id = setInterval(() => {
      const next = base - (Date.now() - start);
      if (next <= 0) {
        setRemaining(0);
        setRunning(false);
        notify({ title: "Timer finished", message: "Time's up!" });
        clearInterval(id);
      } else {
        setRemaining(next);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const total = remaining || (minutes * 60 + seconds) * 1000;
  const mm = String(Math.floor(total / 60000)).padStart(2, "0");
  const ss = String(Math.floor((total % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <div className="font-mono text-6xl tabular-nums">
        {mm}:{ss}
      </div>
      {!running && remaining === 0 && (
        <div className="flex gap-2">
          <NumField label="Min" value={minutes} onChange={setMinutes} max={180} />
          <NumField label="Sec" value={seconds} onChange={setSeconds} max={59} />
        </div>
      )}
      <div className="flex gap-2">
        {!running ? (
          <button
            onClick={() => {
              const ms = (minutes * 60 + seconds) * 1000;
              if (remaining === 0 && ms === 0) return;
              setRemaining(remaining || ms);
              setRunning(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            <Play className="size-4" /> Start
          </button>
        ) : (
          <button
            onClick={() => setRunning(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-white/5"
          >
            <Pause className="size-4" /> Pause
          </button>
        )}
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(0);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        <ClockIcon className="mr-1 inline size-3" /> Timers post a system notification when finished.
      </p>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <label className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, +e.target.value || 0)))}
        className="mt-1 w-20 rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-center text-lg font-mono outline-none focus:border-primary"
      />
    </label>
  );
}
