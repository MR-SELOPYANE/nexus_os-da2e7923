import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface CalEvent {
  id: string;
  date: string; // yyyy-mm-dd
  time: string;
  title: string;
}

const KEY = "nexus.calendar.events";
const SA_HOLIDAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "03-21": "Human Rights Day",
  "04-27": "Freedom Day",
  "05-01": "Workers' Day",
  "06-16": "Youth Day",
  "08-09": "National Women's Day",
  "09-24": "Heritage Day",
  "12-16": "Day of Reconciliation",
  "12-25": "Christmas Day",
  "12-26": "Day of Goodwill",
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Calendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => iso(new Date()));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEvents(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const save = (next: CalEvent[]) => {
    setEvents(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  };

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday-first
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const dayEvents = events
    .filter((e) => e.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time));
  const todayIso = iso(new Date());

  const holidayFor = (d: string) => SA_HOLIDAYS[d.slice(5)];

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="flex-1 p-4">
        <header className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <div className="font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded p-1 hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => {
                const n = new Date();
                setCursor(n);
                setSelected(iso(n));
              }}
              className="rounded px-2 py-1 text-xs hover:bg-white/10"
            >
              Today
            </button>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded p-1 hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="mb-1 grid grid-cols-7 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const key = iso(d);
            const outside = d.getMonth() !== cursor.getMonth();
            const has = events.some((e) => e.date === key);
            const hol = holidayFor(key);
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                title={hol}
                className={`relative aspect-square rounded-md border text-sm transition ${
                  selected === key
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                } ${outside ? "opacity-35" : ""}`}
              >
                <span className={key === todayIso ? "font-bold underline" : ""}>{d.getDate()}</span>
                <span className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                  {has && <span className="size-1.5 rounded-full bg-primary" />}
                  {hol && <span className="size-1.5 rounded-full bg-amber-400" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="w-72 border-l border-white/10 bg-black/25 p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {new Date(selected).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        {holidayFor(selected) && (
          <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
            🇿🇦 {holidayFor(selected)}
          </div>
        )}

        <ul className="mt-3 space-y-1">
          {dayEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
            >
              <span className="font-mono text-xs text-primary">{e.time}</span>
              <span className="flex-1 truncate">{e.title}</span>
              <button
                onClick={() => save(events.filter((x) => x.id !== e.id))}
                className="text-muted-foreground hover:text-red-400"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {dayEvents.length === 0 && (
            <li className="text-xs text-muted-foreground">No events.</li>
          )}
        </ul>

        <div className="mt-3 space-y-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded bg-white/5 px-2 py-1.5 text-xs outline-none"
          />
          <input
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                save([...events, { id: crypto.randomUUID(), date: selected, time, title: title.trim() }]);
                setTitle("");
              }
            }}
            className="w-full rounded bg-white/5 px-2 py-1.5 text-xs outline-none"
          />
          <button
            disabled={!title.trim()}
            onClick={() => {
              save([...events, { id: crypto.randomUUID(), date: selected, time, title: title.trim() }]);
              setTitle("");
            }}
            className="flex w-full items-center justify-center gap-1 rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-3" /> Add event
          </button>
        </div>
      </aside>
    </div>
  );
}
