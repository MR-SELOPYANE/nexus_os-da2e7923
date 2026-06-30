import { Cpu, MemoryStick, X } from "lucide-react";
import { useOS } from "@/os/store";

export function TaskManager() {
  const processes = useOS((s) => s.processes);
  const killProcess = useOS((s) => s.killProcess);

  const totalCpu = Math.min(100, processes.reduce((a, p) => a + p.cpu, 0));
  const totalMem = processes.reduce((a, p) => a + p.memory, 0);
  const memPct = Math.min(100, (totalMem / 4096) * 100);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="grid grid-cols-2 gap-3 p-3">
        <Gauge icon={Cpu} label="CPU" value={`${totalCpu.toFixed(0)}%`} pct={totalCpu} />
        <Gauge
          icon={MemoryStick}
          label="Memory"
          value={`${(totalMem / 1024).toFixed(2)} / 4 GB`}
          pct={memPct}
        />
      </div>
      <div className="flex items-center gap-2 border-y border-glass-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <span className="w-12">PID</span>
        <span className="flex-1">Process</span>
        <span className="w-16">Status</span>
        <span className="w-14 text-right">CPU</span>
        <span className="w-20 text-right">Memory</span>
        <span className="w-8" />
      </div>
      <div className="flex-1 overflow-y-auto os-scroll">
        {processes.map((p) => (
          <div
            key={p.pid}
            className="flex items-center gap-2 border-b border-glass-border/40 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            <span className="w-12 tabular-nums text-muted-foreground">{p.pid}</span>
            <span className="flex-1 truncate">
              {p.name}
              {p.system && <span className="ml-2 text-xs text-muted-foreground">system</span>}
            </span>
            <span className="w-16 text-xs text-muted-foreground">{p.status}</span>
            <span className="w-14 text-right tabular-nums text-muted-foreground">{p.cpu}%</span>
            <span className="w-20 text-right tabular-nums text-muted-foreground">{p.memory} MB</span>
            <span className="w-8 text-right">
              {!p.system && (
                <button
                  onClick={() => killProcess(p.pid)}
                  className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  title="End task"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gauge({
  icon: Icon,
  label,
  value,
  pct,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="rounded-lg bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{value}</p>
    </div>
  );
}
