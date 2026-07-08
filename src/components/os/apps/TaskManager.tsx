import { useMemo, useState } from "react";
import { Cpu, MemoryStick, X, Moon, Play, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useOS, type Process } from "@/os/store";

type SortKey = "pid" | "cpu" | "memory" | "name" | "priority";
type ViewMode = "flat" | "tree";
type Filter = "all" | "user" | "system";

export function TaskManager() {
  const processes = useOS((s) => s.processes);
  const killProcess = useOS((s) => s.killProcess);
  const setPriority = useOS((s) => s.setPriority);
  const toggleSleep = useOS((s) => s.toggleProcessSleep);

  const [sort, setSort] = useState<SortKey>("cpu");
  const [view, setView] = useState<ViewMode>("flat");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 5: true });

  const filtered = useMemo(() => {
    return processes.filter((p) =>
      filter === "all" ? true : filter === "system" ? p.system : !p.system
    );
  }, [processes, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const av = a[sort] as number;
      const bv = b[sort] as number;
      return sort === "pid" ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const totalCpu = Math.min(100, processes.reduce((a, p) => a + p.cpu, 0));
  const totalMem = processes.reduce((a, p) => a + p.memory, 0);
  const memPct = Math.min(100, (totalMem / 4096) * 100);
  const running = processes.filter((p) => p.status === "running").length;
  const zombies = processes.filter((p) => p.status === "zombie").length;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="grid grid-cols-3 gap-3 p-3">
        <Gauge icon={Cpu} label="CPU" value={`${totalCpu.toFixed(0)}%`} pct={totalCpu} />
        <Gauge icon={MemoryStick} label="Memory" value={`${(totalMem / 1024).toFixed(2)} / 4 GB`} pct={memPct} />
        <div className="rounded-lg bg-black/20 p-3 text-xs">
          <div className="text-sm font-medium">Processes</div>
          <div className="mt-2 space-y-0.5 tabular-nums text-muted-foreground">
            <div>Total: {processes.length}</div>
            <div>Running: {running}</div>
            {zombies > 0 && <div className="text-rose-400">Zombie: {zombies}</div>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-y border-glass-border bg-black/10 px-3 py-1 text-[11px]">
        {(["flat", "tree"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setView(m)}
            className={`rounded px-2 py-0.5 capitalize ${view === m ? "bg-primary/25 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
          >{m}</button>
        ))}
        <span className="mx-1 h-3 w-px bg-white/10" />
        {(["all", "user", "system"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-0.5 capitalize ${filter === f ? "bg-primary/25 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
          >{f}</button>
        ))}
        <span className="ml-auto text-muted-foreground">
          Sort:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="ml-1 rounded bg-black/40 px-1 py-0.5 text-foreground outline-none"
          >
            <option value="cpu">CPU</option>
            <option value="memory">Memory</option>
            <option value="pid">PID</option>
            <option value="priority">Priority</option>
            <option value="name">Name</option>
          </select>
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-glass-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="w-14">PID</span>
        <span className="w-14">PPID</span>
        <span className="flex-1">Process</span>
        <span className="w-16">Status</span>
        <span className="w-14 text-right">Prio</span>
        <span className="w-14 text-right">CPU</span>
        <span className="w-20 text-right">Memory</span>
        <span className="w-24" />
      </div>

      <div className="os-scroll flex-1 overflow-y-auto">
        {view === "tree" ? (
          <TreeView processes={sorted} expanded={expanded} setExpanded={setExpanded} killProcess={killProcess} setPriority={setPriority} toggleSleep={toggleSleep} />
        ) : (
          sorted.map((p) => (
            <Row key={p.pid} p={p} killProcess={killProcess} setPriority={setPriority} toggleSleep={toggleSleep} />
          ))
        )}
      </div>
    </div>
  );
}

function TreeView({ processes, expanded, setExpanded, killProcess, setPriority, toggleSleep }: {
  processes: Process[];
  expanded: Record<number, boolean>;
  setExpanded: (u: Record<number, boolean>) => void;
  killProcess: (pid: number) => void;
  setPriority: (pid: number, n: number) => void;
  toggleSleep: (pid: number) => void;
}) {
  const byParent = useMemo(() => {
    const m: Record<number, Process[]> = {};
    for (const p of processes) (m[p.parentPid] ||= []).push(p);
    return m;
  }, [processes]);

  const render = (parentPid: number, depth: number): JSX.Element[] => {
    const kids = byParent[parentPid] ?? [];
    return kids.flatMap((p) => {
      const hasKids = (byParent[p.pid] ?? []).length > 0;
      const isOpen = expanded[p.pid];
      return [
        <div key={p.pid} className="flex items-center" style={{ paddingLeft: depth * 14 }}>
          <button
            onClick={() => hasKids && setExpanded({ ...expanded, [p.pid]: !isOpen })}
            className="ml-1 grid size-4 place-items-center text-muted-foreground"
            aria-label="toggle"
          >
            {hasKids ? (isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />) : null}
          </button>
          <div className="flex-1">
            <Row p={p} killProcess={killProcess} setPriority={setPriority} toggleSleep={toggleSleep} noPad />
          </div>
        </div>,
        ...(isOpen ? render(p.pid, depth + 1) : []),
      ];
    });
  };
  // Start from roots (parentPid = 0 or missing parent in list)
  const rootPids = Array.from(new Set(processes.filter((p) => !processes.find((x) => x.pid === p.parentPid)).map((p) => p.parentPid)));
  return <>{rootPids.flatMap((rp) => render(rp, 0))}</>;
}

function Row({ p, killProcess, setPriority, toggleSleep, noPad }: {
  p: Process;
  killProcess: (pid: number) => void;
  setPriority: (pid: number, n: number) => void;
  toggleSleep: (pid: number) => void;
  noPad?: boolean;
}) {
  const zombie = p.status === "zombie";
  return (
    <div className={`flex items-center gap-2 border-b border-glass-border/40 ${noPad ? "px-2" : "px-3"} py-1.5 text-sm ${zombie ? "opacity-60" : ""} hover:bg-white/5`}>
      <span className="w-14 tabular-nums text-muted-foreground">{p.pid}</span>
      <span className="w-14 tabular-nums text-muted-foreground">{p.parentPid || "—"}</span>
      <span className="flex-1 truncate">
        {p.name}
        {p.system && <span className="ml-2 rounded bg-white/10 px-1 text-[10px] uppercase text-muted-foreground">sys</span>}
        {zombie && <span className="ml-2 rounded bg-rose-500/20 px-1 text-[10px] uppercase text-rose-400">zombie</span>}
      </span>
      <span className={`w-16 text-xs ${p.status === "running" ? "text-emerald-400" : p.status === "sleeping" ? "text-amber-400" : "text-rose-400"}`}>{p.status}</span>
      <span className="flex w-14 items-center justify-end gap-0.5 tabular-nums">
        {!p.system && !zombie && (
          <button onClick={() => setPriority(p.pid, p.priority - 1)} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Higher priority">
            <ArrowUp className="size-3" />
          </button>
        )}
        <span className={p.priority < 0 ? "text-amber-400" : p.priority > 0 ? "text-sky-400" : "text-muted-foreground"}>{p.priority}</span>
        {!p.system && !zombie && (
          <button onClick={() => setPriority(p.pid, p.priority + 1)} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Lower priority">
            <ArrowDown className="size-3" />
          </button>
        )}
      </span>
      <span className="w-14 text-right tabular-nums text-muted-foreground">{p.cpu}%</span>
      <span className="w-20 text-right tabular-nums text-muted-foreground">{p.memory} MB</span>
      <span className="flex w-24 items-center justify-end gap-1">
        {!p.system && !zombie && (
          <>
            <button
              onClick={() => toggleSleep(p.pid)}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground"
              title={p.status === "sleeping" ? "Resume (SIGCONT)" : "Suspend (SIGSTOP)"}
            >
              {p.status === "sleeping" ? <Play className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            <button
              onClick={() => killProcess(p.pid)}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              title="End task (SIGKILL)"
            >
              <X className="size-3.5" />
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function Gauge({ icon: Icon, label, value, pct }: { icon: typeof Cpu; label: string; value: string; pct: number }) {
  return (
    <div className="rounded-lg bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{value}</p>
    </div>
  );
}
